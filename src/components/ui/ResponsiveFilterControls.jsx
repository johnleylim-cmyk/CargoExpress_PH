const defaultOptionLabel = (option) => {
  const suffix = option.count !== undefined ? ` (${option.count})` : '';
  return `${option.label}${suffix}`;
};

const ResponsiveFilterControls = ({
  options,
  value,
  onChange,
  ariaLabel,
  label = 'Filter',
  className = '',
  desktopClassName = 'tabs',
  buttonClassName,
  optionLabel = defaultOptionLabel,
}) => {
  const selected = options.find(option => option.value === value);

  const getButtonClassName = (option, active) => {
    if (typeof buttonClassName === 'function') return buttonClassName(option, active);
    return `tab ${option.buttonClassName || ''} ${active ? 'active' : ''}`.trim();
  };

  return (
    <div className={`responsive-filter ${className}`.trim()}>
      <div className={`${desktopClassName} responsive-filter-tabs`.trim()} role="tablist" aria-label={ariaLabel}>
        {options.map(option => {
          const active = value === option.value;
          const Icon = option.icon;

          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={active}
              className={getButtonClassName(option, active)}
              onClick={() => onChange(option.value)}
              style={option.style}
            >
              {Icon && <Icon size={option.iconSize || 14} aria-hidden="true" />}
              <span>{option.label}</span>
              {option.count !== undefined && <span className="tab-count">{option.count}</span>}
            </button>
          );
        })}
      </div>

      <label className="responsive-filter-select-wrap">
        <span className="responsive-filter-select-label">{label}</span>
        <select
          className="form-select responsive-filter-select"
          value={value}
          aria-label={ariaLabel}
          onChange={event => onChange(event.target.value)}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {optionLabel(option)}
            </option>
          ))}
        </select>
        {selected && <span className="responsive-filter-current">{optionLabel(selected)}</span>}
      </label>
    </div>
  );
};

export default ResponsiveFilterControls;
