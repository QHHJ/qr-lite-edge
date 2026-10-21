import { PropTypes } from "prop-types";

export default function QRPositionMarker({
  image,
  width,
  height,
  result,
  results,
  onSelect,
  mirror,
  flash = true,
  flashDelay = "0s",
  className = "",
}) {
  const markers = results || (result ? [result] : []);

  const styles = {
    transform: mirror ? "scaleX(-1)" : "none",
  };

  return (
    <svg
      aria-label={onSelect ? "QR codes" : undefined}
      viewBox={`0 0 ${width} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className} style={styles}
    >
      {image && <image href={image} x="0" y="0" width={width} height={height} />}
      {width > 0 && height > 0 && markers.map((item, index) => <g
        key={index}
        role={onSelect ? "button" : undefined}
        tabIndex={onSelect ? 0 : undefined}
        aria-label={`QR ${index + 1}: ${item.content}`}
        aria-pressed={onSelect ? item === result : undefined}
        onClick={() => onSelect?.(item)}
        onKeyDown={(e) => {
          if (onSelect && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onSelect(item);
          }
        }}
        style={{ cursor: onSelect ? "pointer" : "inherit" }}
      ><polygon
        style={{
          animation: flash
            ? `0.2s steps(3, jump-start) ${flashDelay} 3 flash`
            : "none",
        }}
        fill={onSelect ? "#00880018" : "none"}
        stroke={item === result ? "#88FF00" : "#00bfff"}
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeOpacity="0.9"
        points={item.vertices.map((v) => v.join(",")).join(" ")}
      />{onSelect && item.vertices.length > 0 && <text
        x={item.vertices[0][0]} y={item.vertices[0][1]}
        fill="white" stroke="#163520" strokeWidth="3"
        paintOrder="stroke" fontSize={Math.max(width, height) / 28}
        dominantBaseline="hanging"
      >{index + 1}</text>}</g>)}
    </svg>
  );
}

QRPositionMarker.propTypes = {
  image: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  result: PropTypes.object,
  results: PropTypes.array,
  onSelect: PropTypes.func,
  mirror: PropTypes.bool,
  flash: PropTypes.bool,
  flashDelay: PropTypes.string,
  hidden: PropTypes.bool,
  className: PropTypes.string,
};
