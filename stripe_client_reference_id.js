(function() {
  'use strict';
  
  // Extract client_reference_id from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const clientRefId = urlParams.get('client_reference_id');
  
  // Only proceed if client_reference_id exists
  if (!clientRefId) {
    console.log('No client_reference_id found in URL');
    return;
  }
  
  console.log('Found client_reference_id:', clientRefId);
  
  // Function to check if URL is a Stripe buy link
  function isStripeBuyLink(url) {
    try {
      return url && url.includes('buy.stripe.com/');
    } catch (e) {
      return false;
    }
  }
  
  // Function to add client_reference_id to a URL
  function addClientRefToUrl(urlString) {
    try {
      const url = new URL(urlString);
      url.searchParams.set('client_reference_id', clientRefId);
      return url.toString();
    } catch (e) {
      // If URL parsing fails, try simple string manipulation
      const separator = urlString.includes('?') ? '&' : '?';
      return urlString + separator + 'client_reference_id=' + encodeURIComponent(clientRefId);
    }
  }
  
  // Function to process all Stripe links
  function processStripeLinks() {
    console.log('Processing Stripe links...');
    
    // Handle anchor tags
    const allLinks = document.querySelectorAll('a');
    console.log('Found', allLinks.length, 'total links');
    
    allLinks.forEach(link => {
      const href = link.getAttribute('href');
      console.log('Checking link:', href);
      
      if (isStripeBuyLink(href)) {
        console.log('Found Stripe link:', href);
        const newHref = addClientRefToUrl(href);
        link.href = newHref;
        console.log('Updated to:', newHref);
      }
    });
    
    // Handle buttons with onclick attributes
    document.querySelectorAll('button[onclick]').forEach(button => {
      const onclick = button.getAttribute('onclick');
      if (onclick && onclick.includes('buy.stripe.com/')) {
        const updatedOnclick = onclick.replace(
          /(https:\/\/buy\.stripe\.com\/[^'"&\s]+)/g,
          (match) => addClientRefToUrl(match)
        );
        button.setAttribute('onclick', updatedOnclick);
      }
    });
    
    // Handle form actions
    document.querySelectorAll('form').forEach(form => {
      const action = form.getAttribute('action');
      if (isStripeBuyLink(action)) {
        form.action = addClientRefToUrl(action);
      }
    });
  }
  
  // Function to intercept click events (catches dynamically created elements)
  function interceptClicks(event) {
    const target = event.target;
    
    // Handle anchor tags
    if (target.tagName === 'A') {
      const href = target.getAttribute('href');
      if (isStripeBuyLink(href) && !href.includes('client_reference_id=')) {
        event.preventDefault();
        window.location.href = addClientRefToUrl(href);
      }
    }
    
    // Handle buttons
    if (target.tagName === 'BUTTON' || target.type === 'button') {
      const onclick = target.getAttribute('onclick');
      if (onclick && onclick.includes('buy.stripe.com/') && !onclick.includes('client_reference_id=')) {
        event.preventDefault();
        const match = onclick.match(/https:\/\/buy\.stripe\.com\/[^'"&\s]+/);
        if (match) {
          window.location.href = addClientRefToUrl(match[0]);
        }
      }
    }
  }
  
  // Function to intercept window.open calls
  const originalOpen = window.open;
  window.open = function(url, ...args) {
    if (isStripeBuyLink(url)) {
      url = addClientRefToUrl(url);
    }
    return originalOpen.apply(this, [url, ...args]);
  };
  
  // Main initialization function
  function init() {
    console.log('Initializing Stripe client reference script...');
    processStripeLinks();
    
    // Add click event listener to catch dynamic elements
    document.addEventListener('click', interceptClicks, true);
    
    // Watch for DOM changes
    if (window.MutationObserver) {
      const observer = new MutationObserver(function(mutations) {
        let shouldProcess = false;
        mutations.forEach(function(mutation) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            shouldProcess = true;
          }
        });
        if (shouldProcess) {
          processStripeLinks();
        }
      });
      
      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['href', 'onclick', 'action']
      });
    }
  }
  
  // Run immediately if possible
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('DOM already ready, running immediately');
    init();
  } else {
    console.log('DOM not ready, waiting...');
    document.addEventListener('DOMContentLoaded', init);
  }
  
  // Also run after window load as a backup
  window.addEventListener('load', function() {
    console.log('Window loaded, running backup init');
    init();
  });
  
  // Run every 500ms for the first 3 seconds as ultimate fallback
  let attempts = 0;
  const maxAttempts = 6;
  const fallbackInterval = setInterval(function() {
    attempts++;
    console.log('Fallback attempt', attempts);
    
    if (document.body && document.querySelectorAll('a').length > 0) {
      init();
      clearInterval(fallbackInterval);
    } else if (attempts >= maxAttempts) {
      clearInterval(fallbackInterval);
    }
  }, 500);
  
})();
