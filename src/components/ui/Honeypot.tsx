import { HONEYPOT } from "@/lib/leads";

/**
 * Spam trap: a field people never see or reach with the keyboard, but form-filling
 * bots do. /api/leads quietly drops any submission where it has a value.
 */
export function Honeypot() {
  return (
    <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", top: "auto", width: 1, height: 1, overflow: "hidden" }}>
      <label>
        Leave this field empty
        <input type="text" name={HONEYPOT} tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}
