/**
 * Virtual List Utilities
 * Implements virtual scrolling for large transaction/receipt lists
 */

export interface VirtualListConfig {
  itemHeight: number        // Height of each item in pixels
  overscan: number          // Extra items to render above/below viewport
  containerHeight: number   // Height of the scrollable container
}

export interface VirtualListState {
  scrollTop: number
  visibleStart: number
  visibleEnd: number
  totalHeight: number
  offsetY: number
}

export interface VirtualListItem<T> {
  index: number
  data: T
  style: {
    position: 'absolute'
    top: number
    left: number
    width: string
    height: number
  }
}

/**
 * Calculate virtual list state based on scroll position
 */
export function calculateVirtualListState(
  totalItems: number,
  scrollTop: number,
  config: VirtualListConfig
): VirtualListState {
  const { itemHeight, overscan, containerHeight } = config
  
  const totalHeight = totalItems * itemHeight
  
  // Calculate visible range
  const visibleStart = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const visibleCount = Math.ceil(containerHeight / itemHeight) + (overscan * 2)
  const visibleEnd = Math.min(totalItems - 1, visibleStart + visibleCount)
  
  // Offset for positioning
  const offsetY = visibleStart * itemHeight
  
  return {
    scrollTop,
    visibleStart,
    visibleEnd,
    totalHeight,
    offsetY
  }
}

/**
 * Get visible items with positioning styles
 */
export function getVisibleItems<T>(
  items: T[],
  state: VirtualListState,
  itemHeight: number
): VirtualListItem<T>[] {
  const visibleItems: VirtualListItem<T>[] = []
  
  for (let i = state.visibleStart; i <= state.visibleEnd && i < items.length; i++) {
    visibleItems.push({
      index: i,
      data: items[i],
      style: {
        position: 'absolute',
        top: i * itemHeight,
        left: 0,
        width: '100%',
        height: itemHeight
      }
    })
  }
  
  return visibleItems
}

/**
 * Debounce scroll handler
 */
export function createScrollHandler(
  callback: (scrollTop: number) => void,
  delay: number = 16 // ~60fps
): (event: Event) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastScrollTop = 0
  
  return (event: Event) => {
    const target = event.target as HTMLElement
    lastScrollTop = target.scrollTop
    
    if (timeoutId) return
    
    timeoutId = setTimeout(() => {
      callback(lastScrollTop)
      timeoutId = null
    }, delay)
  }
}

/**
 * Binary search to find item by scroll position
 */
export function findItemAtPosition(
  scrollTop: number,
  itemHeight: number
): number {
  return Math.floor(scrollTop / itemHeight)
}

/**
 * Scroll to specific item
 */
export function scrollToItem(
  itemIndex: number,
  itemHeight: number,
  containerElement: HTMLElement,
  behavior: ScrollBehavior = 'smooth'
): void {
  const targetScrollTop = itemIndex * itemHeight
  containerElement.scrollTo({
    top: targetScrollTop,
    behavior
  })
}

/**
 * Check if item is in viewport
 */
export function isItemVisible(
  itemIndex: number,
  itemHeight: number,
  scrollTop: number,
  containerHeight: number
): boolean {
  const itemTop = itemIndex * itemHeight
  const itemBottom = itemTop + itemHeight
  const viewportBottom = scrollTop + containerHeight
  
  return itemTop < viewportBottom && itemBottom > scrollTop
}
