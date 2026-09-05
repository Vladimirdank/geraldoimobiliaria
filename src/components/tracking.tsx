"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { Settings } from "@/types";
declare global {
  interface Window {
    dataLayer: any[];
    fbq?: any;
    gtag?: any;
  }
}
export function Tracking({ settings: s }: { settings: Settings }) {
  const path = usePathname();
  const loadedConfig = useRef("");
  const [consent, setConsent] = useState<string | null>("pending");
  useEffect(() => {
    let utms: Record<string, string> = {};
    const q = new URLSearchParams(location.search);
    ["source", "medium", "campaign", "content", "term"].forEach((k) => {
      const v = q.get("utm_" + k);
      if (v) utms["utm_" + k] = v;
    });
    try {
      if (Object.keys(utms).length)
        sessionStorage.setItem("geraldo-utms", JSON.stringify(utms));
      setConsent(localStorage.getItem("geraldo-consent"));
    } catch {}
  }, []);
  useEffect(() => {
    if (consent !== "accepted" || path.startsWith("/admin")) return;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: "PageView", page_path: path });
    const onEvent = (e: Event) => {
      const data = (e as CustomEvent).detail;
      window.dataLayer.push(data);
      window.fbq?.("trackCustom", data.event, {
        property_id: data.property_id,
      });
    };
    window.addEventListener("geraldo-track", onEvent);
    return () => window.removeEventListener("geraldo-track", onEvent);
  }, [path, consent]);
  useEffect(() => {
    if (consent !== "accepted" || path.startsWith("/admin")) return;
    const config = [s.gtm, s.ga4, s.meta_pixel].join("|");
    if (loadedConfig.current === config) return;
    loadedConfig.current = config;
    const add = (id: string, src: string) => {
      if (document.getElementById(id)) return;
      const t = document.createElement("script");
      t.id = id;
      t.src = src;
      t.async = true;
      document.head.appendChild(t);
    };
    window.dataLayer = window.dataLayer || [];
    if (/^GTM-[A-Z0-9]+$/.test(s.gtm || "")) {
      window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
      add("gtm", `https://www.googletagmanager.com/gtm.js?id=${s.gtm}`);
    }
    if (/^G-[A-Z0-9]+$/.test(s.ga4 || "")) {
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
      window.gtag("js", new Date());
      window.gtag("config", s.ga4);
      add("ga4", `https://www.googletagmanager.com/gtag/js?id=${s.ga4}`);
    }
    if (/^\d+$/.test(s.meta_pixel || "")) {
      const fb: any = function () {
        fb.callMethod
          ? fb.callMethod.apply(fb, arguments)
          : fb.queue.push(arguments);
      };
      fb.queue = [];
      fb.loaded = true;
      fb.version = "2.0";
      window.fbq = fb;
      fb("init", s.meta_pixel);
      fb("track", "PageView");
      add("meta-pixel", "https://connect.facebook.net/en_US/fbevents.js");
    }
  }, [consent, s.gtm, s.ga4, s.meta_pixel, path]);
  if (
    path.startsWith("/admin") ||
    consent !== null ||
    (!s.gtm && !s.ga4 && !s.meta_pixel)
  )
    return null;
  return (
    <div className="cookie-banner">
      <p>
        Podemos usar cookies de análise para melhorar sua experiência?{" "}
        <Link href="/privacidade">Saiba mais</Link>
      </p>
      <button
        onClick={() => {
          localStorage.setItem("geraldo-consent", "rejected");
          setConsent("rejected");
        }}
      >
        Recusar
      </button>
      <button
        className="button"
        onClick={() => {
          localStorage.setItem("geraldo-consent", "accepted");
          setConsent("accepted");
        }}
      >
        Aceitar
      </button>
    </div>
  );
}
export function PropertyTracking({ id }: { id: string }) {
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("geraldo-track", {
        detail: { event: "ViewProperty", property_id: id },
      }),
    );
  }, [id]);
  return null;
}
