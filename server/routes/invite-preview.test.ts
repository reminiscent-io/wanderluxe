import { describe, it, expect } from 'vitest';
import { isBot } from './invite-preview';

describe('isBot (invite-preview bot detection)', () => {
  // -------------------------------------------------------------------------
  // Known bot / crawler user agents → should return true
  // -------------------------------------------------------------------------
  describe('known bots return true', () => {
    it('Facebook external hit crawler', () => {
      expect(isBot('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')).toBe(true);
    });

    it('Facebot', () => {
      expect(isBot('Facebot')).toBe(true);
    });

    it('Twitterbot', () => {
      expect(isBot('Twitterbot/1.0')).toBe(true);
    });

    it('LinkedIn bot', () => {
      expect(isBot('LinkedInBot/1.0 (compatible; +http://www.linkedin.com)')).toBe(true);
    });

    it('WhatsApp link preview', () => {
      expect(isBot('WhatsApp/2.19.71 A')).toBe(true);
    });

    it('Slackbot link preview', () => {
      expect(isBot('Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)')).toBe(true);
    });

    it('TelegramBot', () => {
      expect(isBot('TelegramBot (like TwitterBot)')).toBe(true);
    });

    it('Discordbot', () => {
      expect(isBot('Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)')).toBe(true);
    });

    it('Applebot (Apple web crawler)', () => {
      expect(isBot('Mozilla/5.0 (compatible; Applebot/0.1; +http://www.apple.com/go/applebot)')).toBe(true);
    });

    it('Googlebot', () => {
      expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
    });

    it('Google Inspection Tool', () => {
      expect(isBot('Mozilla/5.0 (compatible; Google-InspectionTool/1.0)')).toBe(true);
    });

    it('bingbot', () => {
      expect(isBot('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true);
    });

    it('generic "bot" substring', () => {
      expect(isBot('SomeCoolLinkBot/1.0')).toBe(true);
    });

    it('generic "crawler" substring', () => {
      expect(isBot('MyCrawler/1.0')).toBe(true);
    });

    it('generic "spider" substring', () => {
      expect(isBot('WebSpider/2.0')).toBe(true);
    });

    // -----------------------------------------------------------------------
    // macOS Messages / Apple link preview agents (the iMessage Mac bug)
    // -----------------------------------------------------------------------
    it('macOS Messages link preview: MessageMedia agent', () => {
      // The Messages app on macOS uses this UA when generating link preview cards
      expect(isBot('MessageMedia/1.0 CFNetwork/1390.0.1 Darwin/22.0.0')).toBe(true);
    });

    it('macOS Messages link preview: CFNetwork with MessageMedia prefix (older macOS)', () => {
      expect(isBot('MessageMedia/1.0 CFNetwork/1197 Darwin/20.0.0')).toBe(true);
    });

    it('macOS Safari View Service (in-app preview)', () => {
      expect(isBot('com.apple.SafariViewService/8614.4.6.1')).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Real browser user agents → should return false
  // -------------------------------------------------------------------------
  describe('real browsers return false', () => {
    it('returns false for undefined user-agent', () => {
      expect(isBot(undefined)).toBe(false);
    });

    it('returns false for empty string user-agent', () => {
      expect(isBot('')).toBe(false);
    });

    it('Safari on macOS (the Mac iMessage click target)', () => {
      expect(
        isBot(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
        )
      ).toBe(false);
    });

    it('Chrome on macOS', () => {
      expect(
        isBot(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
      ).toBe(false);
    });

    it('Firefox on macOS', () => {
      expect(
        isBot(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0'
        )
      ).toBe(false);
    });

    it('Safari on iPhone (the working case)', () => {
      expect(
        isBot(
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1'
        )
      ).toBe(false);
    });

    it('Chrome on Android', () => {
      expect(
        isBot(
          'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.43 Mobile Safari/537.36'
        )
      ).toBe(false);
    });

    it('Safari on iPad', () => {
      expect(
        isBot(
          'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        )
      ).toBe(false);
    });

    it('does not false-positive on "safari" in UA (was previously matching "preview" broadly)', () => {
      // The old 'preview' pattern would NOT have matched Safari, but verifying correctness
      expect(
        isBot('Mozilla/5.0 ... Version/17.0 Safari/605.1.15')
      ).toBe(false);
    });
  });
});
