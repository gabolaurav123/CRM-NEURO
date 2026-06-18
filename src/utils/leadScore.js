export function leadScoreLabel(score) {
  const number = Number(score || 0);
  if (number >= 80) return 'Alta intencion';
  if (number >= 45) return 'Nutrir';
  return 'Frio';
}
