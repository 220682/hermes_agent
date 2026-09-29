/** F3-07/F3-08: what the Space bar does. Push-to-talk when the app is quiet; a hard stop when
 * JEIGER is thinking or speaking (barge-in). Space typed into a field, or activating a focused
 * button, is left to the browser. */

export type SpaceAction = "ignore" | "interrupt" | "toggle-mic";

export interface SpaceContext {
  repeat: boolean;
  modifier: boolean;
  /** tagName of the focused element, or "" */
  targetTag: string;
  targetEditable: boolean;
  turnActive: boolean;
  speaking: boolean;
}

const NATIVE_SPACE_TARGETS = new Set(["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"]);

export function decideSpaceAction(ctx: SpaceContext): SpaceAction {
  if (ctx.repeat || ctx.modifier || ctx.targetEditable || NATIVE_SPACE_TARGETS.has(ctx.targetTag.toUpperCase())) {
    return "ignore";
  }

  return ctx.turnActive || ctx.speaking ? "interrupt" : "toggle-mic";
}
