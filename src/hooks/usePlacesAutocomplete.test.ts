import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type React from 'react';
import { usePlacesAutocomplete } from './usePlacesAutocomplete';
import { searchPlaces, getPlaceDetails, type AutocompleteResult, type PlaceResult } from '@/utils/googleMapsLoader';

vi.mock('@/utils/googleMapsLoader', () => ({
  searchPlaces: vi.fn(),
  getPlaceDetails: vi.fn(),
}));

const prediction = (id: string): AutocompleteResult =>
  ({
    place_id: id,
    description: `${id} description`,
    structured_formatting: { main_text: id, secondary_text: '' },
  }) as AutocompleteResult;

const details = (id: string): PlaceResult =>
  ({ place_id: id, name: `${id} name`, formatted_address: `${id} address` }) as PlaceResult;

const key = (k: string) => ({ key: k, preventDefault: vi.fn() }) as unknown as React.KeyboardEvent;

describe('usePlacesAutocomplete', () => {
  beforeEach(() => {
    vi.mocked(searchPlaces).mockReset();
    vi.mocked(getPlaceDetails).mockReset();
  });

  it('does not search below two characters', async () => {
    const { result } = renderHook(() => usePlacesAutocomplete({ onSelect: vi.fn() }));
    await act(() => result.current.search('a'));
    expect(searchPlaces).not.toHaveBeenCalled();
    expect(result.current.showSuggestions).toBe(false);
  });

  it('searches with the given type and opens on results', async () => {
    vi.mocked(searchPlaces).mockResolvedValue([prediction('a'), prediction('b')]);
    const { result } = renderHook(() =>
      usePlacesAutocomplete({ onSelect: vi.fn(), searchType: 'geocode' }),
    );
    await act(() => result.current.search('par'));
    expect(searchPlaces).toHaveBeenCalledWith('par', 'geocode');
    expect(result.current.suggestions).toHaveLength(2);
    expect(result.current.showSuggestions).toBe(true);
  });

  it('arrow keys move the highlight and Enter selects it', async () => {
    vi.mocked(searchPlaces).mockResolvedValue([prediction('a'), prediction('b')]);
    vi.mocked(getPlaceDetails).mockResolvedValue(details('b'));
    const onSelect = vi.fn();
    const { result } = renderHook(() => usePlacesAutocomplete({ onSelect }));
    await act(() => result.current.search('par'));

    act(() => result.current.handleKeyDown(key('ArrowDown')));
    act(() => result.current.handleKeyDown(key('ArrowDown')));
    act(() => result.current.handleKeyDown(key('ArrowDown'))); // clamps at the last item
    expect(result.current.selectedIndex).toBe(1);

    act(() => result.current.handleKeyDown(key('Enter')));
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith(details('b'), prediction('b')));
    expect(result.current.showSuggestions).toBe(false);
    expect(result.current.selectedIndex).toBe(-1);
  });

  it('blocks Enter while closed only when asked to', () => {
    const blocking = renderHook(() => usePlacesAutocomplete({ onSelect: vi.fn(), blockEnterWhenClosed: true }));
    const e1 = key('Enter');
    blocking.result.current.handleKeyDown(e1);
    expect(e1.preventDefault).toHaveBeenCalled();

    const passing = renderHook(() => usePlacesAutocomplete({ onSelect: vi.fn() }));
    const e2 = key('Enter');
    passing.result.current.handleKeyDown(e2);
    expect(e2.preventDefault).not.toHaveBeenCalled();
  });

  it('keeps the dropdown open on a failed lookup unless a fallback is given', async () => {
    vi.mocked(searchPlaces).mockResolvedValue([prediction('a')]);
    vi.mocked(getPlaceDetails).mockRejectedValue(new Error('boom'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const plain = renderHook(() => usePlacesAutocomplete({ onSelect: vi.fn() }));
    await act(() => plain.result.current.search('par'));
    await act(() => plain.result.current.selectSuggestion(prediction('a')));
    expect(plain.result.current.showSuggestions).toBe(true);

    const onDetailsError = vi.fn();
    const onSelectingChange = vi.fn();
    const withFallback = renderHook(() =>
      usePlacesAutocomplete({ onSelect: vi.fn(), onDetailsError, onSelectingChange }),
    );
    await act(() => withFallback.result.current.search('par'));
    await act(() => withFallback.result.current.selectSuggestion(prediction('a')));
    expect(onDetailsError).toHaveBeenCalledWith(prediction('a'));
    expect(withFallback.result.current.showSuggestions).toBe(false);
    expect(onSelectingChange.mock.calls).toEqual([[true], [false]]);
  });
});
