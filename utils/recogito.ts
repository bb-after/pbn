/**
 * Utility functions for working with Recogito annotation tool
 */

/**
 * Load Recogito CSS if not already loaded
 */
export const loadRecogitoCSS = async (): Promise<void> => {
  if (!document.querySelector('link[href="/vendor/recogito.min.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/vendor/recogito.min.css';
    document.head.appendChild(link);
    // Give it a moment to load
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};

/**
 * Load Recogito script if not already loaded
 */
export const loadRecogitoScript = async (): Promise<any> => {
  if (!(window as any).Recogito) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/vendor/recogito.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Recogito script'));
      document.head.appendChild(script);
    });
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return (window as any).Recogito?.Recogito || (window as any).Recogito?.default;
};

/**
 * Initialize a Recogito instance for viewing version content
 */
export const initVersionRecogito = async (options: {
  contentElementId: string;
  annotations: any[];
  readOnly?: boolean;
  currentInstance?: any;
  formatter?: (annotation: any) => string; // Add formatter to the options type
}): Promise<any> => {
  const {
    contentElementId,
    annotations,
    readOnly = true,
    currentInstance,
    formatter, // Destructure the formatter
  } = options;

  // Clean up existing instance if provided
  if (currentInstance) {
    try {
      currentInstance.destroy();
    } catch (err) {
      console.error('Error destroying previous Recogito instance:', err);
    }
  }

  try {
    // Ensure CSS and script are loaded
    await loadRecogitoCSS();
    const Recogito = await loadRecogitoScript();

    if (!Recogito) {
      console.error('Recogito constructor not found after script loading');
      return null;
    }

    // Get the content element
    const contentElement = document.getElementById(contentElementId);
    if (!contentElement) {
      console.error(`Could not find element with ID "${contentElementId}"`);
      return null;
    }

    console.log(`Initializing Recogito on element #${contentElementId}`);

    // Create the instance
    const instance = new Recogito({
      content: contentElement,
      readOnly,
      mode: 'pre',
      locale: 'auto',
      allowEmpty: true,
      widgets: readOnly ? [] : [{ widget: 'COMMENT' }],
      formatter: formatter, // Pass the formatter to Recogito
    });

    console.log('Recogito instance created with formatter:', !!formatter);

    // Apply annotations if provided
    if (annotations && annotations.length > 0) {
      console.log('Setting annotations:', annotations);
      console.log(`Setting ${annotations.length} annotations`);
      instance.setAnnotations(annotations);
    }

    console.log('Recogito instance initialized successfully');
    return instance;
  } catch (err) {
    console.error('Error initializing Recogito:', err);
    return null;
  }
};
