(function() {
  'use strict';
  
  // Extract client_reference_id from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const clientRefId = urlParams.get('client_reference_id');
  
  // Only proceed if client_reference_id exists
  if (!clientRefId) return;
  
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
    // Handle anchor tags
    document.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href');
      if (isStripeBuyLink(href)) {
        link.href = addClientRefToUrl(href);
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
  
  // Function to intercept location changes
  const originalAssign = window.location.assign;
  window.location.assign = function(url) {
    if (isStripeBuyLink(url)) {
      url = addClientRefToUrl(url);
    }
    return originalAssign.call(this, url);
  };
  
  // Run when DOM is ready
  function init() {
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
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['href', 'onclick', 'action']
      });
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();