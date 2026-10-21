import type { CSSProperties } from "react";
import { assets } from "../assets";
import productDescription from "../../Assets/Histrips Assets/Lavender Mouth Tape, Pink Nasal Strips & White Nasal Strips.webp";
import productLogo from "../../Assets/Histrips Assets/logo_product_scene.webp";
import productMain from "../../Assets/Histrips Assets/product_main.webp";
import youveGot from "../../Assets/Histrips Assets/YOU’VE GOT!.webp";
import { PRODUCT_EFFECTS, PRODUCT_LAYOUT } from "../constants";
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
    logo: PRODUCT_LAYOUT.logo[layout.orientation],
    headline: PRODUCT_LAYOUT.headline[layout.orientation],
    description: PRODUCT_LAYOUT.description[layout.orientation],
    product: PRODUCT_LAYOUT.product[layout.orientation],
    cta: PRODUCT_LAYOUT.cta[layout.orientation],
  };
  const overlayBleed = PRODUCT_EFFECTS.overlayBleedPx / layout.scale;
  const overlayStyle = {
    left: `${-layout.offsetX / layout.scale - overlayBleed}px`,
    top: `${-layout.offsetY / layout.scale - overlayBleed}px`,
    width: `${layout.viewW / layout.scale + overlayBleed * 2}px`,
    height: `${layout.viewH / layout.scale + overlayBleed * 2}px`,
  } satisfies CSSProperties;

  return (
    <section className="product-scene" aria-label="Product reveal">
      <div className="product-dim" style={overlayStyle} />
      <img
        className="product-item product-item--logo"
        src={productLogo}
        alt="Histrips"
        style={authoredStyle(authored.logo)}
      />
      <img
        className="product-item product-item--headline"
        src={youveGot}
        alt="You've got!"
        style={authoredStyle(authored.headline)}
      />
      <img
        className="product-item product-item--description"
        src={productDescription}
        alt="Lavender Mouth Tape, Pink Nasal Strips and White Nasal Strips"
        style={authoredStyle(authored.description)}
      />
      <img
        className="product-item product-item--main"
        src={productMain}
        alt="Lavender Mouth Tape, Pink Nasal Strips and White Nasal Strips"
        style={authoredStyle(authored.product)}
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
