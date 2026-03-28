
document.addEventListener('DOMContentLoaded', () => {

  // 1. Service Selection Interaction
  const serviceButtons = document.querySelectorAll('.service-btn');

  serviceButtons.forEach(button => {
      button.addEventListener('click', () => {
          // Remove 'active' selection state from all buttons
          serviceButtons.forEach(btn => btn.classList.remove('active'));
          
          // Add 'active' class to the clicked button
          button.classList.add('active');
      });
  });

  // 2. Submit Emergency Interaction
  const submitBtn = document.querySelector('.btn-submit');
  const textArea = document.querySelector('textarea');

  submitBtn.addEventListener('click', () => {
      const activeService = document.querySelector('.service-btn.active');
      const description = textArea.value.trim();
      
      // Guard Clause: Warn user if no emergency type is selected
      if (!activeService) {
          alert("Please select an emergency service (Ambulance, Fire, or Police) first.");
          return;
      }
      
      const serviceType = activeService.getAttribute('data-service');
      
      // Logging for the console simulation
      console.log(`Submitting ${serviceType} request... Context: "${description}"`);
      
      // Final feedback
      alert(`Emergency dispatch triggered for: ${serviceType.toUpperCase()}`);
  });

});