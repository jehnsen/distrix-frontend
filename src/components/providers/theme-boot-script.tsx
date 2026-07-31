import { UI_STORAGE_KEY } from "@/stores/ui-store";

/**
 * Applies the persisted theme and density before first paint so the app never
 * flashes light-on-dark. Reads the same zustand persist envelope the store
 * writes, and fails silently to the light default.
 */
const boot = `(function(){try{
var s=JSON.parse(localStorage.getItem(${JSON.stringify(UI_STORAGE_KEY)})||"{}").state||{};
var t=s.theme||"light";
var dark=t==="dark"||(t==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);
var el=document.documentElement;
el.classList.toggle("dark",dark);
el.style.colorScheme=dark?"dark":"light";
el.dataset.density=s.density||"default";
}catch(e){document.documentElement.dataset.density="default";}})();`;

export function ThemeBootScript() {
  return <script dangerouslySetInnerHTML={{ __html: boot }} />;
}
