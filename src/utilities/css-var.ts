export const useCssRgbVar = (name: string): string => {
  const value = window
    .getComputedStyle(window?.document?.documentElement)
    .getPropertyValue(name)
    ?.trim();

  return `rgb(${value.split(" ").join(",")})`;
};
