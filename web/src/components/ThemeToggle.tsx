interface Props {
  dark: boolean;
  onToggle: () => void;
}

export default function ThemeToggle({ dark, onToggle }: Props) {
  return (
    <label className="theme-toggle" title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <input
        type="checkbox"
        checked={dark}
        onChange={onToggle}
      />
      <div className="love-heart">
        <div className="bottom" />
      </div>
      <label>
        <span className="round" />
      </label>
    </label>
  );
}
