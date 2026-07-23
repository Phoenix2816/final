export function formatCategory(category, t, i18nKey = "profile.categories") {
  if (!category) return "";
  const catKey = category.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const translated = t(`${i18nKey}.${catKey}`);
  if (translated !== `${i18nKey}.${catKey}`) return translated;
  return category
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
