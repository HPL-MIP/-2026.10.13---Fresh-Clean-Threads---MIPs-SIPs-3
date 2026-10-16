export type AnalyticsEvent =
  | "LOADING"
  | "LOADED"
  | "DISPLAYED"
  | "CHALLENGE_STARTED"
  | "CHALLENGE_SOLVED"
  | "ENDCARD_SHOWN"
  | "CTA_CLICKED";

export function trackEvent(event: AnalyticsEvent) {
  console.log("[Analytics]", event);

  const analytics = window.ALPlayableAnalytics;
  if (analytics && typeof analytics.trackEvent === "function") {
    try {
      analytics.trackEvent(event);
    } catch (error) {
      console.warn("[Analytics] AppLovin delivery failed", error);
    }
  }
}
