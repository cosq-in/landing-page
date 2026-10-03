import useReveal from './useReveal';

/** Fade-and-rise on scroll. `as` picks the element, `delay` is seconds. */
export default function Reveal({ as = 'div', className = '', delay = 0, style, children, ...rest }) {
  const [ref, seen] = useReveal();
  const Tag = as;
  return (
    <Tag
      ref={ref}
      className={`rv ${seen ? 'in' : ''} ${className}`.trim()}
      style={{ ...style, transitionDelay: delay ? `${delay}s` : undefined }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
