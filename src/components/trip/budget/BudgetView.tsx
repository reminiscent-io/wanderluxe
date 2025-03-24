import React, { useMemo } from 'react';

// ... other imports and component code ...

function MyComponent({ amount, currency, exchangeRates }) {
  // ... other component code ...

  const convertedAmount = useMemo(() => {
    if (!amount || !currency || !exchangeRates[currency]) return null;
    return amount * exchangeRates[currency];
  }, [amount, currency, exchangeRates]);

  // ... rest of the component code using convertedAmount ...

}

export default MyComponent;