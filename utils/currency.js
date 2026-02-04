// utils/currency.js
const axios = require('axios');

const API_KEY = 'e7c90a55696a435d9631a55aa34189de';

async function convertCurrency ({
  currency = 'INR', amount = 100 
}) {
  const url = `https://api.currencyfreaks.com/v2.0/rates/latest?apikey=${API_KEY}&symbols=${currency}`;

  try {
    const response = await axios.get(url);
    const usdToCurrencyRate = parseFloat(response.data.rates[currency.toUpperCase()]);

    if (!usdToCurrencyRate || isNaN(usdToCurrencyRate)) {
      throw new Error(`Invalid or missing exchange rate for ${currency}`);
    }

    const currencyToUsdRate = 1 / usdToCurrencyRate;
    const converted = amount * currencyToUsdRate;

    return {
      from: currency.toUpperCase(),
      to: 'USD',
      rate: currencyToUsdRate,
      amount,
      converted: converted.toFixed(2),
    };
  } catch (error) {
    return {
      error: true,
      message: error.message,
    };
  }
}

module.exports = { convertCurrency };
