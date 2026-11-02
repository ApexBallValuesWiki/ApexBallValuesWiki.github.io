// Coolicons line/regular by Kryston Schwarze (MIT); see COOLICONS-LICENSE.txt.
// SVGs adapted into a small tree-shakeable, currentColor React component.
const PATHS = {
  'play': <><path d="M9.02899 4.28501L19.02899 10.28501C20.32367 11.06182 20.32367 12.93818 19.02899 13.71499L9.02899 19.71499C7.69594 20.51482 6 19.55459 6 18L6 6C6 4.44541 7.69594 3.48518 9.02899 4.28501Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
  'pause': <><path d="M4 5C4 3.89543 4.89543 3 6 3H7C8.10457 3 9 3.89543 9 5V19C9 20.10457 8.10457 21 7 21H6C4.89543 21 4 20.10457 4 19ZM15 5C15 3.89543 15.89543 3 17 3H18C19.10457 3 20 3.89543 20 5V19C20 20.10457 19.10457 21 18 21H17C15.89543 21 15 20.10457 15 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
  'arrow-left': <><path d="M10 7L5 12L10 17M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
  'arrow-right': <><path d="M14 17L19 12L14 7M19 12H5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
  'arrow-up-right': <><path d="M10 7H17V14M17 7L7 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
  'chevron-down': <><path d="M8 10L12 14L16 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
  'search': <><path d="M3 10C3 13.86599 6.13401 17 10 17C13.86599 17 17 13.86599 17 10C17 6.13401 13.86599 3 10 3C6.13401 3 3 6.13401 3 10ZM15 15L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
  'filter': <><path d="M12 4H19C19.55228 4 20 4.44772 20 5V6L14 12V18L10 20V12L4 6V5C4 4.44772 4.44772 4 5 4H12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
  'check': <><path d="M6 12L10 16L18 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
  'book-open': <><path d="M12 20V9C12 6.79086 13.79086 5 16 5H19C20.10457 5 21 5.89543 21 7V15C21 16.10457 20.10457 17 19 17H16C15.35971 17 14.64029 17.35971 14 18L12 20ZM12 20V9C12 6.79086 10.20914 5 8 5H5C3.89543 5 3 5.89543 3 7V15C3 16.10457 3.89543 17 5 17H8C8.64029 17 9.35971 17.35971 10 18L12 20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
  'close': <><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
  'sparkles': <><path d="M9 9C9 12 12 15 15 15C12 15 9 18 9 21C9 18 6 15 3 15C6 15 9 12 9 9ZM17 3C17 6.75 17.25 7 21 7C17.25 7 17 7.25 17 11C17 7.25 16.75 7 13 7C16.75 7 17 6.75 17 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
  'diamond': <><path d="M17 17L13 21C12.44772 21.55228 11.55228 21.55228 11 21L3 13C2.44772 12.44772 2.44772 11.55228 3 11L11 3C11.55228 2.44772 12.44772 2.44772 13 3L21 11C21.55228 11.55228 21.55228 12.44772 21 13L17 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
  'activity': <><path d="M3 12H4C5.19438 12 6.40281 10.79157 7 9L9 3L15 21L17 15C17.59719 13.20843 18.80562 12 20 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></>,
};
export default function CoolIcon({ name, size = 20, className = '' }) {
  if (!PATHS[name]) return null;
  return <svg className={`cool-icon ${className}`.trim()} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">{PATHS[name]}</svg>;
}
