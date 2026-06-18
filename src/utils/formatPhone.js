export function formatPhone(value) {
  if (!value) return '-';
  const text = String(value).replace(/[^\d+]/g, '');
  if (text.length <= 4) return text;
  return text.replace(/(\+\d{1,3})?(\d{3})(\d{3})(\d+)/, (_, country = '', a, b, rest) =>
    [country, a, b, rest].filter(Boolean).join(' ')
  );
}
