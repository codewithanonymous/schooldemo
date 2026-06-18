/**
 * Converts a number to words in Indian Rupees format (Lakhs and Crores).
 * E.g., 5000 -> Five Thousand Rupees Only
 * E.g., 102500 -> One Lakh Two Thousand Five Hundred Rupees Only
 */
export function convertNumberToWords(num) {
  const parsed = Math.floor(num);
  if (isNaN(parsed) || parsed < 0) return "";
  if (parsed === 0) return "Zero Rupees Only";

  const singleDigits = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const doubleDigits = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tensMultiple = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  let words = "";

  const helper = (n) => {
    let temp = "";
    if (n > 99) {
      temp += singleDigits[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n > 19) {
      temp += tensMultiple[Math.floor(n / 10)] + " ";
      n %= 10;
    }
    if (n > 0 && n < 10) {
      temp += singleDigits[n] + " ";
    } else if (n >= 10 && n < 20) {
      temp += doubleDigits[n - 10] + " ";
    }
    return temp;
  };

  let remaining = parsed;

  // Handle Crores (1,00,00,000)
  const crores = Math.floor(remaining / 10000000);
  remaining %= 10000000;
  if (crores > 0) {
    words += helper(crores) + "Crore ";
  }

  // Handle Lakhs (1,00,000)
  const lakhs = Math.floor(remaining / 100000);
  remaining %= 100000;
  if (lakhs > 0) {
    words += helper(lakhs) + "Lakh ";
  }

  // Handle Thousands (1,000)
  const thousands = Math.floor(remaining / 1000);
  remaining %= 1000;
  if (thousands > 0) {
    words += helper(thousands) + "Thousand ";
  }

  // Handle remaining hundreds, tens, and units
  if (remaining > 0) {
    words += helper(remaining);
  }

  return words.replace(/\s+/g, " ").trim() + " Rupees Only";
}
export default convertNumberToWords;
