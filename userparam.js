(function() {
  'use strict';
  
  // Extract parameters from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const clientRefId = urlParams.get('client_reference_id');
  const userId = urlParams.get('userId');
  
  // Only proceed if we have at least one parameter value
  if (!clientRefId && !userId) return;
  
  // Function to check if URL is a Stripe buy link
  function isStripeBuyLink(url) {
    try {
      return url && url.includes('buy.stripe.com/');
    } catch (e) {
      return false;
    }
  }
  
  // Function to check if URL is a Fapi form link
  function isFapiFormLink(url) {
    try {
      return url && url.includes('form.fapi.cz/');
    } catch (e) {
      return false;
    }
  }
  
  // Function to add client_reference_id to Stripe URLs (using available parameter value)
  function addClientRefToUrl(urlString) {
    const valueToUse = clientRefId || userId; // Prefer clientRefId for Stripe
    if (!valueToUse) return urlString;
    
    try {
      const url = new URL(urlString);
      url.searchParams.set('client_reference_id', valueToUse);
      return url.toString();
    } catch (e) {
      // If URL parsing fails, try simple string manipulation
      const separator = urlString.includes('?') ? '&' : '?';
      return urlString + separator + 'client_reference_id=' + encodeURIComponent(valueToUse);
    }
  }
  
  // Function to add userId to Fapi URLs (using available parameter value)
  function addUserIdToUrl(urlString) {
    const valueToUse = userId || clientRefId; // Prefer userId for Fapi
    if (!valueToUse) return urlString;
    
    try {
      const url = new URL(urlString);
      url.searchParams.set('userId', valueToUse);
      return url.toString();
    } catch (e) {
      // If URL parsing fails, try simple string manipulation
      const separator = urlString.includes('?') ? '&' : '?';
      return urlString + separator + 'userId=' + encodeURIComponent(valueToUse);
    }
  }
  
  // Function to process URLs based on their type
  function processUrl(urlString) {
    if (isStripeBuyLink(urlString)) {
      return addClientRefToUrl(urlString);
    } else if (isFapiFormLink(urlString)) {
      return addUserIdToUrl(urlString);
    }
    return urlString;
  }
  
  // Function to process all relevant links
  function processLinks() {
    // Handle anchor tags
    document.querySelectorAll('a').forEach(link => {
      const href = link.getAttribute('href');
      if (isStripeBuyLink(href) || isFapiFormLink(href)) {
        link.href = processUrl(href);
      }
    });
    
    // Handle buttons with onclick attributes
    document.querySelectorAll('button[onclick]').forEach(button => {
      const onclick = button.getAttribute('onclick');
      if (onclick && (onclick.includes('buy.stripe.com/') || onclick.includes('form.fapi.cz/'))) {
        let updatedOnclick = onclick;
        
        // Update Stripe links with client_reference_id
        updatedOnclick = updatedOnclick.replace(
          /(https:\/\/buy\.stripe\.com\/[^'"&\s]+)/g,
          (match) => addClientRefToUrl(match)
        );
        
        // Update Fapi links with userId
        updatedOnclick = updatedOnclick.replace(
          /(https:\/\/form\.fapi\.cz\/[^'"&\s]+)/g,
          (match) => addUserIdToUrl(match)
        );
        
        button.setAttribute('onclick', updatedOnclick);
      }
    });
    
    // Handle form actions
    document.querySelectorAll('form').forEach(form => {
      const action = form.getAttribute('action');
      if (isStripeBuyLink(action) || isFapiFormLink(action)) {
        form.action = processUrl(action);
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
      } else if (isFapiFormLink(href) && !href.includes('userId=')) {
        event.preventDefault();
        window.location.href = addUserIdToUrl(href);
      }
    }
    
    // Handle buttons
    if (target.tagName === 'BUTTON' || target.type === 'button') {
      const onclick = target.getAttribute('onclick');
      if (onclick) {
        // Handle Stripe links
        if (onclick.includes('buy.stripe.com/') && !onclick.includes('client_reference_id=')) {
          event.preventDefault();
          const match = onclick.match(/https:\/\/buy\.stripe\.com\/[^'"&\s]+/);
          if (match) {
            window.location.href = addClientRefToUrl(match[0]);
          }
        }
        // Handle Fapi links
        else if (onclick.includes('form.fapi.cz/') && !onclick.includes('userId=')) {
          event.preventDefault();
          const match = onclick.match(/https:\/\/form\.fapi\.cz\/[^'"&\s]+/);
          if (match) {
            window.location.href = addUserIdToUrl(match[0]);
          }
        }
      }
    }
  }
  
  // Function to intercept window.open calls
  const originalOpen = window.open;
  window.open = function(url, ...args) {
    if (isStripeBuyLink(url)) {
      url = addClientRefToUrl(url);
    } else if (isFapiFormLink(url)) {
      url = addUserIdToUrl(url);
    }
    return originalOpen.apply(this, [url, ...args]);
  };
  
  // Run when DOM is ready
  function init() {
    processLinks();
    
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
          processLinks();
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
