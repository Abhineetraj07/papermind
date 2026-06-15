export default function LogoMark({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18.5" stroke="#c8a951" strokeWidth="1"/>
      <circle cx="20" cy="20" r="4.5" fill="#c8a951" fillOpacity=".25"/>
      <circle cx="20" cy="20" r="2.5" fill="#c8a951"/>
      {/* spokes */}
      <line x1="20" y1="17.5" x2="20" y2="5"  stroke="#c8a951" strokeWidth="1.1" strokeOpacity=".65"/>
      <line x1="22.2" y1="18.7" x2="33" y2="12" stroke="#c8a951" strokeWidth="1.1" strokeOpacity=".65"/>
      <line x1="22.2" y1="21.3" x2="33" y2="28" stroke="#c8a951" strokeWidth="1.1" strokeOpacity=".65"/>
      <line x1="20" y1="22.5" x2="20" y2="35" stroke="#c8a951" strokeWidth="1.1" strokeOpacity=".65"/>
      <line x1="17.8" y1="21.3" x2="7" y2="28" stroke="#c8a951" strokeWidth="1.1" strokeOpacity=".65"/>
      <line x1="17.8" y1="18.7" x2="7" y2="12" stroke="#c8a951" strokeWidth="1.1" strokeOpacity=".65"/>
      {/* outer nodes */}
      <circle cx="20" cy="5"  r="2" fill="#c8a951" fillOpacity=".5"/>
      <circle cx="33" cy="12" r="2" fill="#c8a951" fillOpacity=".5"/>
      <circle cx="33" cy="28" r="2" fill="#c8a951" fillOpacity=".5"/>
      <circle cx="20" cy="35" r="2" fill="#c8a951" fillOpacity=".5"/>
      <circle cx="7"  cy="28" r="2" fill="#c8a951" fillOpacity=".5"/>
      <circle cx="7"  cy="12" r="2" fill="#c8a951" fillOpacity=".5"/>
    </svg>
  )
}
