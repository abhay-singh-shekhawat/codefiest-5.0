import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import deviceTier from '../hooks/useDeviceTier.js'
import { createLayerRenderer } from '../three/rendererPool.js'
import DeferredRender from './DeferredRender.jsx'

const { isMobile, isLowEndDevice } = deviceTier
const DUST_COUNT = isMobile ? 60 : 180

const ROCK_IMAGES = Array.from({ length: 12 }, (_, i) => `/rocks/${i + 1}.png`)

const NODE_LABELS = [
  'Generative AI',
  'Web3 & DAOs',
  'Climate Tech',
  'Open Innovation',
  'Cyber Resilience',
  'Smart Cities',
  'AR / VR',
  'Robotics',
  'BioTech',
  'FinTech',
  'Edge AI',
  'Creative Frontier',
]

const NODE_COLORS = [
  '#00f5ff', '#a855f7', '#22d3ee', '#f59e0b',
  '#34d399', '#f43f5e', '#818cf8', '#fb923c',
  '#2dd4bf', '#e879f9', '#facc15', '#38bdf8',
]

/**
 * StardustCanvas — slow ambient floating dust particles.
 * Pure canvas 2-D, drawn behind the Three.js scene.
 */
function StardustCanvas() {
  const ref = useRef(null)
  useEffect(() => {
    if (isLowEndDevice) return   // skip canvas rAF on low-end devices
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let W = canvas.offsetWidth
    let H = canvas.offsetHeight
    canvas.width  = W
    canvas.height = H

    // Create particles — count reduced on mobile via DUST_COUNT
    const particles = Array.from({ length: DUST_COUNT }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      r:     Math.random() * 1.4 + 0.3,
      vx:    (Math.random() - 0.5) * 0.12,
      vy:   -(Math.random() * 0.08 + 0.03),
      alpha: Math.random() * 0.5 + 0.15,
      // warm tint — cyan / purple mix matching site theme
      hue:  Math.random() > 0.55 ? 195 : 270,  // cyan or purple
    }))

    const step = () => {
      ctx.clearRect(0, 0, W, H)
      for (const p of particles) {
        p.x  += p.vx
        p.y  += p.vy
        // Wrap around
        if (p.y < -2)   p.y = H + 2
        if (p.x < -2)   p.x = W + 2
        if (p.x > W + 2) p.x = -2

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${p.hue}, 80%, 85%, ${p.alpha})`
        ctx.fill()
      }
    }

    // Fully pause the rAF chain when the canvas is off-screen or the tab
    // is hidden (mirrors the Three.js loop gating in this section).
    let visible = true
    let rafId = 0
    const tick = (now) => {
      rafId = 0
      if (!visible || document.hidden) return
      step()
      rafId = requestAnimationFrame(tick)
    }
    const syncLoop = () => {
      const shouldRun = visible && !document.hidden
      if (shouldRun && !rafId) rafId = requestAnimationFrame(tick)
      else if (!shouldRun && rafId) { cancelAnimationFrame(rafId); rafId = 0 }
    }
    const observer = new IntersectionObserver(
      ([entry]) => { visible = entry.isIntersecting; syncLoop() },
      { threshold: 0 },
    )
    observer.observe(canvas)
    const onVisibilityChange = () => syncLoop()
    document.addEventListener('visibilitychange', onVisibilityChange)
    syncLoop()

    const onResize = () => {
      W = canvas.offsetWidth
      H = canvas.offsetHeight
      canvas.width  = W
      canvas.height = H
    }
    window.addEventListener('resize', onResize)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      observer.disconnect()
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={ref}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        zIndex: 0, pointerEvents: 'none',
      }}
    />
  )
}

/**
 * ThemesSceneLayer — owns the WebGL Saturn scene + ambient stardust canvas.
 * Rendered lazily by <DeferredRender>, so the WebGL context, the procedural
 * texture build and the 12 rock-PNG fetches only happen when section 2
 * approaches the viewport.
 *
 * Performance architecture:
 *   – Ring rocks instanced (1500 in a single InstancedMesh draw call)
 *   – Tooltip positions via refs + direct DOM — zero React re-renders at 60fps
 *   – Renderer from shared rendererPool (tiered DPR policy)
 *   – rAF chain fully pauses off-screen / tab-hidden; delta clamped on resume
 *   – All geometries, materials and textures disposed on unmount
 */
function ThemesSceneLayer() {
  const containerRef = useRef(null)
  const tooltipContainerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    const tooltipContainer = tooltipContainerRef.current
    if (!container || !tooltipContainer) return

    const W = container.clientWidth  || window.innerWidth
    const H = container.clientHeight || window.innerHeight

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 1000)
    camera.position.set(0, 5, 28)
    camera.lookAt(0, 2.5, 0)

    // Shift model up so the full Saturn + rings are visible in viewport
    const modelOffsetY = 2.5

    const { renderer, setSize: setRendererSize, dispose: disposeRenderer } =
      createLayerRenderer({ allowHighDpr: true })
    setRendererSize(W, H)
    container.appendChild(renderer.domElement)

    // ── Lighting ────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x1a0e04, 0.8))
    const sun = new THREE.DirectionalLight(0xfff8f0, 5.5)
    sun.position.set(16, 9, 13); scene.add(sun)
    const rim = new THREE.DirectionalLight(0xffe0a0, 1.8)
    rim.position.set(-8, 6, 10); scene.add(rim)
    const fill = new THREE.DirectionalLight(0xb05010, 0.3)
    fill.position.set(-15, -7, -10); scene.add(fill)
    const cool = new THREE.DirectionalLight(0x4488ff, 0.4)
    cool.position.set(0, 12, -6); scene.add(cool)

    // ── Shared tilt group — Saturn mesh + ring particles + sprites all share
    //    the exact same orbital plane tilt. Only saturnMesh spins on its Y-axis.
    const worldGroup = new THREE.Group()
    worldGroup.position.y = modelOffsetY
    worldGroup.rotation.z = THREE.MathUtils.degToRad(-26.7)   // axial tilt
    worldGroup.rotation.x = THREE.MathUtils.degToRad(8)
    scene.add(worldGroup)

    // Saturn sub-group (contains planet mesh + halos + ring particles)
    const saturnGroup = new THREE.Group()
    worldGroup.add(saturnGroup)

    // ── Procedural Saturn texture (reduced to 1024×512) ─────────────────────
    const TEX_W = 1024, TEX_H = 512
    const sCanvas = document.createElement('canvas')
    sCanvas.width = TEX_W; sCanvas.height = TEX_H
    const sctx = sCanvas.getContext('2d')
    const baseGrad = sctx.createLinearGradient(0, 0, 0, TEX_H)
    ;[
      [0.00,'#1a0800'],[0.10,'#4a1e06'],[0.22,'#7a3008'],
      [0.35,'#c45a09'],[0.44,'#f08010'],[0.48,'#fbb020'],
      [0.50,'#ffffff'],[0.52,'#fbb020'],[0.56,'#f08010'],
      [0.65,'#c45a09'],[0.78,'#842808'],[0.90,'#4a1a04'],[1.00,'#1a0800'],
    ].forEach(([s, c]) => baseGrad.addColorStop(s, c))
    sctx.fillStyle = baseGrad
    sctx.fillRect(0, 0, TEX_W, TEX_H)
    for (let y = 0; y < TEX_H; y++) {
      const n  = y / TEX_H
      const lf = Math.sin(n * Math.PI * 12 + Math.cos(n * 20) * 0.35)
      const mu = Math.sin(n * Math.PI * 40) * 0.4 + Math.cos(n * 80) * 0.2
      const ba = 0.14 + 0.22 * Math.sin(n * Math.PI * 24 + mu)
      let col = '#ea580c'
      if      (lf >  0.45) col = '#fef3c7'
      else if (lf >  0.15) col = '#fbbf24'
      else if (lf > -0.15) col = '#f59e0b'
      else if (lf > -0.45) col = '#c2410c'
      else                  col = '#78350f'
      sctx.fillStyle = col
      sctx.globalAlpha = Math.max(0.06, Math.min(ba, 0.46))
      sctx.fillRect(0, y, TEX_W, 1)
    }
    sctx.globalAlpha = 1
    const id = sctx.getImageData(0, 0, TEX_W, TEX_H)
    const dd = id.data
    for (let i = 0; i < dd.length; i += 4) {
      const nx = (Math.random() - 0.5) * 10
      dd[i]   = Math.min(255, Math.max(0, dd[i]   + nx))
      dd[i+1] = Math.min(255, Math.max(0, dd[i+1] + nx * 0.75))
      dd[i+2] = Math.min(255, Math.max(0, dd[i+2] + nx * 0.4))
    }
    sctx.putImageData(id, 0, 0)

    // ── Asymmetric features so Y-rotation is visually obvious ──────────────
    // Dark equatorial belt
    sctx.globalAlpha = 0.38
    sctx.fillStyle = '#5a1a02'
    sctx.fillRect(0, TEX_H * 0.46, TEX_W, TEX_H * 0.08)

    // Bright storm oval (off-centre so it sweeps past as Saturn rotates)
    sctx.globalAlpha = 0.72
    const stormGrad = sctx.createRadialGradient(
      TEX_W * 0.28, TEX_H * 0.42, 0,
      TEX_W * 0.28, TEX_H * 0.42, TEX_W * 0.06,
    )
    stormGrad.addColorStop(0, '#fffbe6')
    stormGrad.addColorStop(0.4, '#fcd34d')
    stormGrad.addColorStop(1, 'transparent')
    sctx.fillStyle = stormGrad
    sctx.beginPath()
    sctx.ellipse(TEX_W * 0.28, TEX_H * 0.42, TEX_W * 0.06, TEX_H * 0.055, 0, 0, Math.PI * 2)
    sctx.fill()

    // Second smaller spot on opposite side so full rotation is trackable
    sctx.globalAlpha = 0.45
    const spot2 = sctx.createRadialGradient(
      TEX_W * 0.72, TEX_H * 0.55, 0,
      TEX_W * 0.72, TEX_H * 0.55, TEX_W * 0.035,
    )
    spot2.addColorStop(0, '#fef3c7')
    spot2.addColorStop(1, 'transparent')
    sctx.fillStyle = spot2
    sctx.beginPath()
    sctx.ellipse(TEX_W * 0.72, TEX_H * 0.55, TEX_W * 0.035, TEX_H * 0.032, 0, 0, Math.PI * 2)
    sctx.fill()

    sctx.globalAlpha = 1
    const satTex = new THREE.CanvasTexture(sCanvas)
    satTex.generateMipmaps = true
    satTex.minFilter = THREE.LinearMipmapLinearFilter
    satTex.magFilter = THREE.LinearFilter

    const saturnMesh = new THREE.Mesh(
      new THREE.SphereGeometry(4.35, 64, 48),
      new THREE.MeshStandardMaterial({ map: satTex, roughness: 0.62, metalness: 0.08 })
    )
    saturnGroup.add(saturnMesh)

    // Inner atmosphere halo
    saturnGroup.add(new THREE.Mesh(
      new THREE.SphereGeometry(4.44, 48, 32),
      new THREE.MeshBasicMaterial({
        color: 0xf09020, transparent: true, opacity: 0.18,
        blending: THREE.AdditiveBlending, side: THREE.BackSide,
      })
    ))
    // Outer pulsing halo
    const outerAtmoMat = new THREE.MeshBasicMaterial({
      color: 0xff6a00, transparent: true, opacity: 0.07,
      blending: THREE.AdditiveBlending, side: THREE.BackSide,
    })
    saturnGroup.add(new THREE.Mesh(new THREE.SphereGeometry(5.4, 32, 24), outerAtmoMat))

    // ── Static particle ring (reduced 4200 → 1500) ──────────────────────────
    const ROCK_COUNT = 1500
    const ringGroup = new THREE.Group()
    saturnGroup.add(ringGroup)
    const pGeo = new THREE.DodecahedronGeometry(0.048, 0)
    const pp = pGeo.attributes.position
    for (let p = 0; p < pp.count; p++) {
      const nf = 1 + (Math.random() - 0.5) * 0.45
      pp.setXYZ(p, pp.getX(p)*nf, pp.getY(p)*nf, pp.getZ(p)*nf)
    }
    pGeo.computeVertexNormals()
    const pMat  = new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0.08, flatShading: true })
    const pMesh = new THREE.InstancedMesh(pGeo, pMat, ROCK_COUNT)
    const pd    = new THREE.Object3D()
    const rColors = [0xf5ebe1,0xddc0a5,0xc99c75,0xa77f5c,0x87674b,0xfff5ea].map(c => new THREE.Color(c))
    for (let i = 0; i < ROCK_COUNT; i++) {
      const outer  = Math.random() > 0.62
      const radius = outer
        ? THREE.MathUtils.lerp(8.05, 10.25, Math.sqrt(Math.random()))
        : THREE.MathUtils.lerp(5.75, 7.6,   Math.pow(Math.random(), 0.8))
      const ang = Math.random() * Math.PI * 2
      const yd  = (Math.random() - 0.5) * 0.11 * (1 - (radius - 5.75) / 5)
      pd.position.set(Math.cos(ang)*radius, yd, Math.sin(ang)*radius)
      let bs = 0.55 + Math.random() * 0.85
      const st = Math.random()
      if (st > 0.96) bs *= 2.6; else if (st > 0.85) bs *= 1.8
      pd.scale.set(bs*(0.8+Math.random()*0.4), bs*(0.7+Math.random()*0.5), bs*(0.8+Math.random()*0.4))
      pd.rotation.set(Math.random()*Math.PI*2, Math.random()*Math.PI*2, Math.random()*Math.PI*2)
      pd.updateMatrix()
      pMesh.setMatrixAt(i, pd.matrix)
      pMesh.setColorAt(i, rColors[Math.floor(Math.random() * rColors.length)])
    }
    if (pMesh.instanceColor) pMesh.instanceColor.needsUpdate = true
    ringGroup.add(pMesh)

    // ── 12 Image sprites ────────────────────────────────────────────────────
    // orbitGroup is a child of worldGroup — inherits the shared tilt automatically.
    const orbitGroup = new THREE.Group()
    worldGroup.add(orbitGroup)

    const ORBIT_RADIUS  = 12.5
    const SPRITE_H      = 3.2
    const SPRITE_ASPECT = 1220 / 768
    const SPRITE_W      = SPRITE_H * SPRITE_ASPECT

    const loader  = new THREE.TextureLoader()
    const sprites  = []
    const loadedTextures = []   // rock PNG textures — disposed on unmount

    ROCK_IMAGES.forEach((src, idx) => {
      const tex = loader.load(src)
      tex.colorSpace = THREE.SRGBColorSpace
      loadedTextures.push(tex)
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        sizeAttenuation: true,
      })
      const sprite = new THREE.Sprite(mat)
      sprite.scale.set(SPRITE_W, SPRITE_H, 1)
      const startAngle = (idx / ROCK_IMAGES.length) * Math.PI * 2
      sprite.userData.angle     = startAngle
      sprite.userData.idx       = idx
      sprite.userData.baseW     = SPRITE_W
      sprite.userData.baseH     = SPRITE_H
      sprite.position.set(
        Math.cos(startAngle) * ORBIT_RADIUS,
        0,
        Math.sin(startAngle) * ORBIT_RADIUS,
      )
      orbitGroup.add(sprite)
      sprites.push(sprite)
    })

    // ── Resize ───────────────────────────────────────────────────────────────
    const onResize = () => {
      const w = container.clientWidth  || window.innerWidth
      const h = container.clientHeight || window.innerHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      setRendererSize(w, h)
    }
    window.addEventListener('resize', onResize)

    // ── Raycaster for hover detection ────────────────────────────────────────
    const raycaster = new THREE.Raycaster()
    const mouse     = new THREE.Vector2(-999, -999)

    const onMouseMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect()
      mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
      mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1
    }
    container.addEventListener('mousemove', onMouseMove)

    // ── Visibility gating ────────────────────────────────────────────────────
    // rAF chain fully stops off-screen / tab-hidden; the first delta after
    // resume is clamped so rotation/orbits never jump after a pause.
    let visible = true
    let animationId = 0
    let lastTime = performance.now()
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        syncLoop()
      },
      { threshold: 0 },
    )
    observer.observe(container)

    const syncLoop = () => {
      const shouldRun = visible && !document.hidden
      if (shouldRun && !animationId) {
        animationId = requestAnimationFrame(animate)
      } else if (!shouldRun && animationId) {
        cancelAnimationFrame(animationId)
        animationId = 0
      }
    }
    const onVisibilityChange = () => {
      if (!document.hidden) lastTime = performance.now()
      syncLoop()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    // ── Render loop (NO React setState calls) ────────────────────────────────
    let elapsed = 0
    const tmpVec  = new THREE.Vector3()
    const ORBIT_SPEED = 0.18
    const SATURN_SPIN = 0.35   // faster than orbit so rotation is clearly visible

    // Pre-create tooltip DOM elements for each sprite (avoids React rendering)
    const tooltipEls = ROCK_IMAGES.map((_, idx) => {
      const wrapper = document.createElement('div')
      wrapper.className = 'absolute pointer-events-none'
      wrapper.style.cssText = `transform:translate(-50%,-50%);z-index:30;display:none;`

      const inner = document.createElement('div')
      inner.style.cssText = `margin-top:52px;`

      const label = document.createElement('div')
      label.className = 'px-3 py-1.5 rounded-lg font-mono font-bold tracking-widest uppercase'
      label.style.cssText = `background:rgba(4,8,20,0.92);white-space:nowrap;font-size:11px;`
      label.textContent = '▶ ' + NODE_LABELS[idx]

      const arrow = document.createElement('div')
      arrow.style.cssText = `position:absolute;left:50%;top:-6px;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;`

      inner.appendChild(label)
      inner.appendChild(arrow)
      wrapper.appendChild(inner)
      tooltipContainer.appendChild(wrapper)

      return { wrapper, label, arrow, color: NODE_COLORS[idx] }
    })

    const animate = (now) => {
      animationId = 0
      if (!visible || document.hidden) return

      const delta = Math.min((now - lastTime) * 0.001, 0.05)
      lastTime = now
      elapsed += delta

      outerAtmoMat.opacity = 0.05 + 0.04 * Math.sin(elapsed * 1.4)

      // Rotate Saturn's mesh on its local Y-axis.
      saturnMesh.rotation.y += delta * SATURN_SPIN

      // Hover detection
      raycaster.setFromCamera(mouse, camera)
      const hits = raycaster.intersectObjects(sprites)
      const hitIdx = hits.length > 0 ? hits[0].object.userData.idx : null

      const W2 = container.clientWidth  || window.innerWidth
      const H2 = container.clientHeight || window.innerHeight

      // Update sprites and tooltip positions via direct DOM manipulation
      sprites.forEach((sprite) => {
        const idx = sprite.userData.idx

        sprite.userData.angle += delta * ORBIT_SPEED
        const a = sprite.userData.angle
        const bobY = Math.sin(elapsed * 0.85 + idx * 1.05) * 0.28

        sprite.position.set(
          Math.cos(a) * ORBIT_RADIUS,
          bobY,
          Math.sin(a) * ORBIT_RADIUS,
        )

        const isHov    = hitIdx === idx
        const hoverMul = isHov ? 1.35 : 1.0
        const targetW  = sprite.userData.baseW * hoverMul
        const targetH  = sprite.userData.baseH * hoverMul
        sprite.scale.x += (targetW - sprite.scale.x) * 0.12
        sprite.scale.y += (targetH - sprite.scale.y) * 0.12

        sprite.material.color.setRGB(1, 1, 1)

        // Project world pos → screen for tooltip (direct DOM, no React state)
        tmpVec.copy(sprite.position)
        tmpVec.applyMatrix4(worldGroup.matrixWorld)
        tmpVec.project(camera)

        const sx = ( tmpVec.x * 0.5 + 0.5) * W2
        const sy = (-tmpVec.y * 0.5 + 0.5) * H2
        const behind = tmpVec.z > 1
        const showTooltip = isHov && !behind

        const tEl = tooltipEls[idx]
        if (showTooltip) {
          tEl.wrapper.style.display = 'block'
          tEl.wrapper.style.left = sx + 'px'
          tEl.wrapper.style.top  = sy + 'px'
          tEl.label.style.color = tEl.color
          tEl.label.style.border = `1px solid ${tEl.color}99`
          tEl.label.style.boxShadow = `0 0 14px 2px ${tEl.color}55`
          tEl.label.style.backdropFilter = 'blur(10px)'
          tEl.arrow.style.borderBottom = `6px solid ${tEl.color}99`
        } else {
          tEl.wrapper.style.display = 'none'
        }
      })

      renderer.render(scene, camera)
      syncLoop()
    }
    syncLoop()

    return () => {
      if (animationId) cancelAnimationFrame(animationId)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      observer.disconnect()
      window.removeEventListener('resize', onResize)
      container.removeEventListener('mousemove', onMouseMove)
      // Clean up tooltip DOM elements
      tooltipEls.forEach(el => el.wrapper.remove())
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
      disposeRenderer()
      // Dispose every geometry and material (and any textures referenced
      // by material properties), plus the separately-tracked textures.
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
          mats.forEach((m) => {
            Object.keys(m).forEach((key) => {
              const v = m[key]
              if (v && v.isTexture) v.dispose()
            })
            m.dispose()
          })
        }
      })
      loadedTextures.forEach((t) => t.dispose())
      satTex.dispose()
    }
  }, [])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Stardust haze canvas — slow drifting particles behind Saturn */}
      <StardustCanvas />
      <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }} />

      {/* Tooltip overlay — managed via refs, not React state */}
      <div ref={tooltipContainerRef} className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }} />
    </div>
  )
}

/**
 * ThemesPage — section copy + headings over the lazily-mounted render layers.
 */
export default function ThemesPage() {
  return (
    <div style={{
      width: '100%', height: '100%', position: 'relative',
      background: `
        radial-gradient(ellipse at 60% 40%, rgba(168,85,247,0.12) 0%, transparent 55%),
        radial-gradient(ellipse at 30% 70%, rgba(0,245,255,0.08) 0%, transparent 50%),
        #030712
      `.replace(/\s+/g, ' ').trim(),
    }}>
      {/* Heavy render layers mount only as this section nears the viewport */}
      <DeferredRender className="absolute inset-0">
        <ThemesSceneLayer />
      </DeferredRender>

      {/* ── "CHOOSE YOUR BATTLEGROUND" heading ── */}
      <div
        className="absolute inset-x-0 top-0 flex flex-col items-center pointer-events-none"
        style={{ zIndex: 20, paddingTop: '2.5rem' }}
      >
        <motion.h2
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="voxel-3d-text voxel-white-block font-pixel font-black uppercase text-center select-none"
          style={{
            fontSize: 'clamp(1.4rem, 3.5vw, 2.6rem)',
            letterSpacing: '0.12em',
            lineHeight: 1,
          }}
        >
          Choose Your Battleground
        </motion.h2>
      </div>
    </div>
  )
}
