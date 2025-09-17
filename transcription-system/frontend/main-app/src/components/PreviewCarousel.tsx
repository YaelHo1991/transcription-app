'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import styles from './PreviewCarousel.module.css'

interface PreviewCarouselProps {
  system: 'licenses' | 'crm' | 'transcription'
  title: string
  pages?: {
    name: string
    hebrewName: string
  }[]
  mockContent?: React.ReactNode
  syncIndex?: number
  onIndexChange?: (index: number) => void
}

export default function PreviewCarousel({ system, title, pages, mockContent, syncIndex, onIndexChange }: PreviewCarouselProps) {
  const [screenshots, setScreenshots] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [currentPage, setCurrentPage] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    const loadScreenshots = async () => {
      setLoading(true)
      const foundScreenshots: string[] = []

      if (system === 'licenses') {
        // Check for license screenshots (license1.png, license2.png, etc.)
        for (let i = 1; i <= 10; i++) {
          const path = `/screenshots/licenses/license${i}.png`
          try {
            const response = await fetch(path, { method: 'HEAD' })
            if (response.ok) {
              foundScreenshots.push(path)
            } else {
              break // Stop checking once we hit a missing file
            }
          } catch {
            break
          }
        }
      } else if (pages) {
        // Check for page-based screenshots (dashboard1.png, clients2.png, etc.)
        for (const page of pages) {
          for (let i = 1; i <= 5; i++) {
            const path = `/screenshots/${system}/${page.name.toLowerCase()}${i}.png`
            try {
              const response = await fetch(path, { method: 'HEAD' })
              if (response.ok) {
                foundScreenshots.push(path)
              }
            } catch {
              // Continue checking other screenshots
            }
          }
        }
      }

      setScreenshots(foundScreenshots)
      setLoading(false)

      // Set initial page label if screenshots exist
      if (foundScreenshots.length > 0 && pages) {
        const firstScreenshot = foundScreenshots[0]
        const pageName = extractPageName(firstScreenshot)
        const page = pages.find(p => p.name.toLowerCase() === pageName)
        if (page) {
          setCurrentPage(page.hebrewName)
        }
      }
    }

    loadScreenshots()
  }, [system, pages])

  const extractPageName = (path: string): string => {
    const filename = path.split('/').pop()?.replace(/\d+\.png$/, '') || ''
    return filename
  }

  const handlePrevious = () => {
    const newIndex = currentIndex === 0 ? screenshots.length - 1 : currentIndex - 1
    setCurrentIndex(newIndex)
    updateCurrentPage(newIndex)
    if (onIndexChange) {
      onIndexChange(newIndex)
    }
  }

  const handleNext = () => {
    const newIndex = currentIndex === screenshots.length - 1 ? 0 : currentIndex + 1
    setCurrentIndex(newIndex)
    updateCurrentPage(newIndex)
    if (onIndexChange) {
      onIndexChange(newIndex)
    }
  }

  const handleIndicatorClick = (index: number) => {
    setCurrentIndex(index)
    updateCurrentPage(index)
    if (onIndexChange) {
      onIndexChange(index)
    }
  }

  const updateCurrentPage = (index: number) => {
    if (pages && screenshots[index]) {
      const pageName = extractPageName(screenshots[index])
      const page = pages.find(p => p.name.toLowerCase() === pageName)
      if (page) {
        setCurrentPage(page.hebrewName)
      }
    }
  }

  // Sync with external index if provided
  useEffect(() => {
    if (syncIndex !== undefined && screenshots.length > 0) {
      const newIndex = syncIndex % screenshots.length
      setCurrentIndex(newIndex)
      updateCurrentPage(newIndex)
    }
  }, [syncIndex, screenshots.length])

  // Auto-advance slideshow only if not synchronized
  useEffect(() => {
    if (screenshots.length > 1 && !isPaused && syncIndex === undefined) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => {
          const nextIndex = prev === screenshots.length - 1 ? 0 : prev + 1
          updateCurrentPage(nextIndex)
          if (onIndexChange) {
            onIndexChange(nextIndex)
          }
          return nextIndex
        })
      }, 6000) // Change slide every 6 seconds for smoother experience

      return () => clearInterval(interval)
    }
  }, [screenshots.length, isPaused, currentIndex, syncIndex, onIndexChange])

  // If no screenshots found and mock content provided, show mock
  if (!loading && screenshots.length === 0 && mockContent) {
    return (
      <div className={styles.previewWindow}>
        <div className={`${styles.previewHeader} ${styles[`${system}Header`]}`}>
          <div className={styles.previewIndicators}>
            <span className={`${styles.indicator} ${styles.active}`}></span>
            <span className={styles.indicator}></span>
            <span className={styles.indicator}></span>
          </div>
        </div>
        <div className={styles.previewContent}>
          {mockContent}
        </div>
      </div>
    )
  }

  // If screenshots found, show carousel
  if (screenshots.length > 0) {
    return (
      <div
        className={styles.previewWindow}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className={`${styles.previewHeader} ${styles[`${system}Header`]}`}>
          {currentPage && <span className={styles.pageLabel}>{currentPage}</span>}
          <div className={styles.navigationControls}>
            <span className={styles.slideCounter}>
              {currentIndex + 1} / {screenshots.length}
            </span>
            {screenshots.length > 1 && (
              <>
                <button
                  className={styles.carouselButton}
                  onClick={handlePrevious}
                  aria-label="Previous screenshot"
                >
                  ‹
                </button>
                <button
                  className={styles.carouselButton}
                  onClick={handleNext}
                  aria-label="Next screenshot"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
        <div className={styles.previewContent}>
          <div className={styles.carouselContainer}>
            <div className={styles.imageContainer}>
              {screenshots.map((screenshot, index) => (
                <Image
                  key={screenshot}
                  src={screenshot}
                  alt={`${system} screenshot ${index + 1}`}
                  fill
                  style={{
                    objectFit: 'cover',
                    opacity: index === currentIndex ? 1 : 0,
                    transform: index === currentIndex ? 'scale(1)' : 'scale(1.1)',
                    transition: 'opacity 1.2s ease-in-out, transform 1.5s ease-in-out',
                    position: 'absolute'
                  }}
                  priority={index === 0}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className={styles.previewWindow}>
        <div className={`${styles.previewHeader} ${styles[`${system}Header`]}`}>
          <div className={styles.previewIndicators}>
            <span className={styles.indicator}></span>
            <span className={styles.indicator}></span>
            <span className={styles.indicator}></span>
          </div>
        </div>
        <div className={styles.previewContent}>
          <div className={styles.loadingMessage}>טוען תצוגה מקדימה...</div>
        </div>
      </div>
    )
  }

  return null
}