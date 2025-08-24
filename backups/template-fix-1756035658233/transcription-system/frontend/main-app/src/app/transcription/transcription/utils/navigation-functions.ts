// Navigation functions for transcription page
// Adapted from PHP version navigation.js

interface MediaFile {
  id: string;
  original_name?: string;
  filename?: string;
  file_type?: string;
  mime_type?: string;
  duration?: string;
  file_size?: number;
  stream_url?: string;
  full_path?: string;
  path?: string;
}

class NavigationManager {
  private currentMediaFiles: MediaFile[] = [];
  private currentMediaIndex: number = 0;
  private currentProjectId: string | null = null;

  // Project navigation functions
  previousProject(): void {
    console.log('[previousProject] Called');
    const projectItems = document.querySelectorAll('.project-item');
    const activeItem = document.querySelector('.project-item.active');
    
    if (!activeItem || projectItems.length <= 1) return;
    
    const currentIndex = Array.from(projectItems).indexOf(activeItem);
    
    if (currentIndex > 0) {
      const prevItem = projectItems[currentIndex - 1] as HTMLElement;
      prevItem.click();
    }
  }

  nextProject(): void {
    console.log('[nextProject] Called');
    const projectItems = document.querySelectorAll('.project-item');
    const activeItem = document.querySelector('.project-item.active');
    
    if (!activeItem || projectItems.length <= 1) return;
    
    const currentIndex = Array.from(projectItems).indexOf(activeItem);
    
    if (currentIndex < projectItems.length - 1) {
      const nextItem = projectItems[currentIndex + 1] as HTMLElement;
      nextItem.click();
    }
  }

  // Media navigation functions
  loadMediaFiles(files: MediaFile[], projectId: string): void {
    console.log('[loadMediaFiles] Loading media files:', files);
    console.log('[loadMediaFiles] Project ID:', projectId);
    
    this.currentMediaFiles = files || [];
    this.currentProjectId = projectId;
    this.currentMediaIndex = 0;
    
    this.updateMediaNavigationUI();
    
    if (this.currentMediaFiles.length > 0) {
      this.loadMediaFile(0);
    }
  }

  loadMediaFile(index: number): void {
    console.log('[loadMediaFile] Called with index:', index);
    
    if (index < 0 || index >= this.currentMediaFiles.length) {
      console.error('[loadMediaFile] Index out of bounds:', index);
      return;
    }
    
    this.currentMediaIndex = index;
    const file = this.currentMediaFiles[index];
    
    console.log('[loadMediaFile] Loading file:', file);
    
    // Update UI
    this.updateCurrentFileName(file.original_name || file.filename || 'Unknown');
    this.updateMediaCounter(index + 1, this.currentMediaFiles.length);
    this.updateMediaFileInfo(file);
    
    // Dispatch media loaded event
    const mediaType = file.file_type || file.mime_type || '';
    window.dispatchEvent(new CustomEvent('mediaLoaded', { 
      detail: { 
        mediaType: mediaType,
        fileIndex: index,
        file: file
      }
    }));
    
    // Update navigation buttons
    this.updateMediaNavigationButtons();
  }

  previousMedia(): void {
    console.log('[previousMedia] Current index:', this.currentMediaIndex);
    if (this.currentMediaIndex > 0) {
      this.loadMediaFile(this.currentMediaIndex - 1);
    }
  }

  nextMedia(): void {
    console.log('[nextMedia] Current index:', this.currentMediaIndex);
    if (this.currentMediaIndex < this.currentMediaFiles.length - 1) {
      this.loadMediaFile(this.currentMediaIndex + 1);
    }
  }

  // UI update functions
  updateProjectCounter(): void {
    const counter = document.getElementById('projectCounter');
    const projectItems = document.querySelectorAll('.project-item');
    const activeItem = document.querySelector('.project-item.active');
    
    if (counter && activeItem) {
      const currentIndex = Array.from(projectItems).indexOf(activeItem) + 1;
      counter.textContent = `${currentIndex}/${projectItems.length}`;
    }
  }

  updateMediaCounter(current: number, total: number): void {
    const counter = document.getElementById('mediaCounter');
    if (counter) {
      counter.textContent = `${current}/${total}`;
    }
  }

  updateCurrentFileName(filename: string): void {
    const element = document.getElementById('fileName');
    if (element) {
      element.textContent = filename || 'אין קובץ נבחר';
      
      // Check if text overflows and apply marquee effect
      const wrapper = element.parentElement;
      if (wrapper && wrapper.classList.contains('file-name-wrapper')) {
        element.classList.remove('marquee');
        
        setTimeout(() => {
          if (element.scrollWidth > wrapper.offsetWidth) {
            element.innerHTML = `<span class="file-name-scroll">${filename} • ${filename} • </span>`;
            element.classList.add('marquee');
          }
        }, 100);
      }
    }
  }

  updateMediaFileInfo(file: MediaFile): void {
    // Update duration
    const durationEl = document.getElementById('fileDuration');
    if (durationEl) {
      durationEl.textContent = file.duration || '00:00:00';
    }
    
    // Update size
    const sizeEl = document.getElementById('fileSize');
    if (sizeEl) {
      const sizeInMB = file.file_size ? (file.file_size / (1024 * 1024)).toFixed(2) : '0';
      sizeEl.textContent = `${sizeInMB} MB`;
    }
    
    // Update type
    const typeEl = document.getElementById('fileType');
    if (typeEl) {
      const fileType = file.file_type || file.mime_type || '';
      const isVideo = fileType.includes('video');
      typeEl.textContent = isVideo ? 'וידאו' : 'אודיו';
    }
  }

  updateMediaNavigationUI(): void {
    this.updateMediaCounter(this.currentMediaIndex + 1, this.currentMediaFiles.length);
    this.updateMediaNavigationButtons();
  }

  updateMediaNavigationButtons(): void {
    const prevBtn = document.getElementById('prevMediaBtn') as HTMLButtonElement;
    const nextBtn = document.getElementById('nextMediaBtn') as HTMLButtonElement;
    
    if (prevBtn) {
      prevBtn.disabled = this.currentMediaIndex === 0 || this.currentMediaFiles.length === 0;
    }
    if (nextBtn) {
      nextBtn.disabled = this.currentMediaIndex >= this.currentMediaFiles.length - 1 || this.currentMediaFiles.length === 0;
    }
  }

  updateNavigationButtons(): void {
    const projectItems = document.querySelectorAll('.project-item');
    const activeItem = document.querySelector('.project-item.active');
    
    const prevBtn = document.getElementById('prevProjectBtn') as HTMLButtonElement;
    const nextBtn = document.getElementById('nextProjectBtn') as HTMLButtonElement;
    
    if (!prevBtn || !nextBtn) return;
    
    if (!activeItem || projectItems.length === 0) {
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }
    
    const currentIndex = Array.from(projectItems).indexOf(activeItem);
    
    prevBtn.disabled = currentIndex === 0 || projectItems.length <= 1;
    nextBtn.disabled = currentIndex >= projectItems.length - 1 || projectItems.length <= 1;
    
    this.updateProjectCounter();
  }

  // Getters for current state
  getCurrentMediaFiles(): MediaFile[] {
    return this.currentMediaFiles;
  }

  getCurrentMediaIndex(): number {
    return this.currentMediaIndex;
  }

  getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }
}

// Create singleton instance
const navigationManager = new NavigationManager();

// Export functions for use in components
export const previousProject = () => navigationManager.previousProject();
export const nextProject = () => navigationManager.nextProject();
export const previousMedia = () => navigationManager.previousMedia();
export const nextMedia = () => navigationManager.nextMedia();
export const loadMediaFiles = (files: MediaFile[], projectId: string) => navigationManager.loadMediaFiles(files, projectId);
export const loadMediaFile = (index: number) => navigationManager.loadMediaFile(index);
export const updateProjectCounter = () => navigationManager.updateProjectCounter();
export const updateMediaCounter = (current: number, total: number) => navigationManager.updateMediaCounter(current, total);
export const updateNavigationButtons = () => navigationManager.updateNavigationButtons();
export const getCurrentMediaFiles = () => navigationManager.getCurrentMediaFiles();
export const getCurrentMediaIndex = () => navigationManager.getCurrentMediaIndex();

export default navigationManager;