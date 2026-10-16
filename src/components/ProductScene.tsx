import type { CSSProperties } from "react";
import { assets } from "../assets";
import { PRODUCT_LAYOUT } from "../constants";
import type { ResponsiveState } from "../hooks/useResponsive";

type ProductSceneProps = {
  layout: ResponsiveState;
  onCta: () => void;
};

function authoredStyle(item: { left: number; top: number; width: number }) {
  return {
    left: `${item.left * 100}%`,
    top: `${item.top * 100}%`,
    width: `${item.width * 100}%`,
  };
}

export function ProductScene({ layout, onCta }: ProductSceneProps) {
  const authored = {
    congratulations: PRODUCT_LAYOUT.congratulations[layout.orientation],
    product: PRODUCT_LAYOUT.product[layout.orientation],
    title: PRODUCT_LAYOUT.title[layout.orientation],
    cta: PRODUCT_LAYOUT.cta[layout.orientation],
  };
  const overlayStyle = {
    left: `${-layout.offsetX / layout.scale}px`,
    top: `${-layout.offsetY / layout.scale}px`,
    width: `${layout.viewW / layout.scale}px`,
    height: `${layout.viewH / layout.scale}px`,
  } satisfies CSSProperties;

  return (
    <section className="product-scene" aria-label="Product reveal">
      <div className="product-dim" style={overlayStyle} />
      <img
        className="product-item product-item--one"
        src={assets.congratulations}
        alt="Congratulations!"
        style={authoredStyle(authored.congratulations)}
      />
      <img
        className="product-item product-item--two"
        src={assets.product}
        alt="Fall Essentials Crew 6-Pack"
        style={authoredStyle(authored.product)}
      />
      <img
        className="product-item product-item--three"
        src={assets.productTitle}
        alt="Fall Essentials Crew 6-Pack"
        style={authoredStyle(authored.title)}
      />
      <button
        className="product-cta"
        style={authoredStyle(authored.cta)}
        onClick={onCta}
        aria-label="Shop now"
      >
        <img src={assets.cta} alt="Shop now" />
      </button>
    </section>
  );
}
