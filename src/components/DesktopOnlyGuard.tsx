import React, { useEffect, useState } from 'react'
import { ExternalLink, GraduationCap, Laptop, Monitor, Smartphone, Tablet } from 'lucide-react'
import './DesktopOnlyGuard.css'

const DESKTOP_BREAKPOINT = 1024
const TABLET_BREAKPOINT = 768

type DeviceType = 'mobile' | 'tablet'

function getDeviceType(width: number): DeviceType {
  return width < TABLET_BREAKPOINT ? 'mobile' : 'tablet'
}

function getDeviceLabel(deviceType: DeviceType): string {
  return deviceType === 'mobile' ? 'Mobile Device Detected' : 'Tablet Device Detected'
}

function DesktopOnlyScreen({ deviceType }: { deviceType: DeviceType }) {
  const DeviceIcon = deviceType === 'mobile' ? Smartphone : Tablet

  return (
    <div className="desktop-only-screen" role="presentation">
      <div className="desktop-only-card">
        <div className="desktop-only-logo">
          <GraduationCap size={28} strokeWidth={2.25} />
          <span>School ERP</span>
        </div>

        <div className="desktop-only-illustration" aria-hidden="true">
          <Monitor size={52} strokeWidth={1.5} className="desktop-only-illustration-icon desktop-only-illustration-icon--primary" />
          <div className="desktop-only-illustration-divider" />
          <Laptop size={44} strokeWidth={1.5} className="desktop-only-illustration-icon" />
        </div>

        <h1 className="desktop-only-title">Desktop View Required</h1>

        <p className="desktop-only-description">
          This School ERP Demo is currently optimized for Desktop and Laptop devices only.
          Please open this application on a desktop or laptop computer for the best experience.
          Mobile and tablet support will be available in a future release.
        </p>

        <div className="desktop-only-device-badge">
          <DeviceIcon size={16} strokeWidth={2} />
          <span>{getDeviceLabel(deviceType)}</span>
        </div>

        <footer className="desktop-only-footer">
          <span className="desktop-only-footer-version">School ERP Demo Version</span>
          <div className="desktop-only-footer-vendor">
            <span className="desktop-only-footer-label">Powered by</span>
            <a
              href="https://amix-sites.lovable.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="desktop-only-vendor-link"
              aria-label="Visit AMIX Sites — opens in a new tab"
            >
              <span className="desktop-only-vendor-link-text">AMIX Sites</span>
              <ExternalLink size={14} strokeWidth={2} className="desktop-only-vendor-link-icon" aria-hidden="true" />
            </a>
          </div>
        </footer>
      </div>
    </div>
  )
}

function useViewport() {
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : DESKTOP_BREAKPOINT,
    isDesktop: typeof window !== 'undefined' ? window.innerWidth >= DESKTOP_BREAKPOINT : true,
  }))

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`)

    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        isDesktop: mediaQuery.matches,
      })
    }

    updateViewport()
    mediaQuery.addEventListener('change', updateViewport)
    window.addEventListener('resize', updateViewport)

    return () => {
      mediaQuery.removeEventListener('change', updateViewport)
      window.removeEventListener('resize', updateViewport)
    }
  }, [])

  return viewport
}

interface DesktopOnlyGuardProps {
  children: React.ReactNode
}

export default function DesktopOnlyGuard({ children }: DesktopOnlyGuardProps) {
  const { width, isDesktop } = useViewport()

  if (!isDesktop) {
    return <DesktopOnlyScreen deviceType={getDeviceType(width)} />
  }

  return <>{children}</>
}
