import { useEffect, useState } from 'react'
import { getSignedPhotoUrl, isStoragePath } from '../lib/supabase'

const FALLBACK = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=900'

/* Exibe foto de imóvel: URL externa/demo direto; path do Storage privado
   resolve para signed URL (1h) a cada montagem. */
export default function PropertyImage({ src, alt, style }: { src?: string | null; alt: string; style?: React.CSSProperties }) {
  const [url, setUrl] = useState<string>(src && !isStoragePath(src) ? src : FALLBACK)

  useEffect(() => {
    let mounted = true
    if (src && isStoragePath(src)) {
      getSignedPhotoUrl(src).then(signed => {
        if (mounted && signed) setUrl(signed)
      })
    } else {
      setUrl(src || FALLBACK)
    }
    return () => { mounted = false }
  }, [src])

  return <img src={url} alt={alt} style={style} />
}
