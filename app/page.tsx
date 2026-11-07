// Root: send visitors to Hindi or English based on their browser language.
export default function Root() {
  return (
    <>
      <meta httpEquiv="refresh" content="0; url=/en/" />
      <script
        dangerouslySetInnerHTML={{
          __html: `try{var l=(navigator.languages||[navigator.language]).join(',');location.replace(/^hi|,hi/.test(l)?'/hi/':'/en/')}catch(e){location.replace('/en/')}`,
        }}
      />
      <p style={{ padding: 24, fontFamily: 'system-ui' }}>
        <a href="/en/">Gangasagar Kirana Stores</a> · <a href="/hi/">गंगासागर किराणा स्टोअर्स</a>
      </p>
    </>
  )
}
