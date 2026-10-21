import { PropTypes } from "prop-types";

export default function QRResults({ results, selected, onSelect }) {
  if (!results.length) return null;
  return <div class="qr-results" aria-label="QR codes">
    {results.map((item, index) => <button
      key={index}
      type="button"
      aria-pressed={item === selected}
      title={item.content}
      onClick={() => onSelect(item)}
    >{index + 1}. {item.content}</button>)}
  </div>;
}

QRResults.propTypes = {
  results: PropTypes.array.isRequired,
  selected: PropTypes.object,
  onSelect: PropTypes.func.isRequired,
};
