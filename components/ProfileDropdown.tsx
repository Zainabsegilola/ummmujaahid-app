// components/ProfileDropdown.tsx

'use client'; // Tell Next.js this code runs in the user's web browser, not on the server computer
import React, { useState, useEffect, useRef } from 'react'; // Get React library and tools for remembering information, running effects, and referencing DOM elements

// Define what information this component needs from its parent
interface ProfileDropdownProps {
  user: any; // User object containing email and other account info
  onLogout: () => void; // Function to call when user clicks logout
  onGoToSettings: () => void; // Function to call when user clicks settings
  onOpenProfile: () => void; // Function to call when user clicks profile
}

export function ProfileDropdown({ user, onLogout, onGoToSettings, onOpenProfile }: ProfileDropdownProps) { // Create reusable dropdown component that receives user data and callback functions from parent
  
  // MEMORY VARIABLES - Track dropdown state
  const [isOpen, setIsOpen] = useState(false); // Remember whether dropdown menu is currently visible (true=showing, false=hidden)
  const dropdownRef = useRef<HTMLDivElement>(null); // Reference to the dropdown container so we can detect clicks outside it

  // CLICK OUTSIDE HANDLER - Close dropdown when user clicks elsewhere on page
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => { // Function that runs when user clicks anywhere on the page
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) { // Check if click was outside our dropdown
        setIsOpen(false); // Update memory: hide the dropdown menu
      }
    };

    if (isOpen) { // Only listen for clicks when dropdown is open (performance optimization)
      document.addEventListener('mousedown', handleClickOutside); // Start listening for clicks anywhere on the page
    }

    return () => { // Cleanup function that runs when component unmounts or isOpen changes
      document.removeEventListener('mousedown', handleClickOutside); // Stop listening for clicks to prevent memory leaks
    };
  }, [isOpen]); // Re-run this effect whenever isOpen changes

  // DROPDOWN DISPLAY
  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      
      <button
        onClick={() => setIsOpen(!isOpen)} // When clicked, flip isOpen from true to false or false to true
        style={{
          width: '40px', // Make button a perfect square
          height: '40px', // Make button a perfect square
          borderRadius: '50%', // Make button perfectly round
          backgroundColor: '#8b5cf6', // Purple background matching app theme
          border: 'none', // Remove default button border
          display: 'flex', // Use flexbox to center the icon
          alignItems: 'center', // Center icon vertically
          justifyContent: 'center', // Center icon horizontally
          cursor: 'pointer', // Show pointer cursor when hovering
          color: 'white', // White icon color to contrast with purple background
          fontSize: '16px', // Medium size for the user icon
          fontWeight: '600' // Semi-bold icon
        }}
      >
        👤
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', // Position dropdown relative to the profile button
          top: '50px', // Position dropdown 50px below the profile button
          right: '0', // Align dropdown's right edge with button's right edge
          backgroundColor: 'white', // White background for dropdown menu
          borderRadius: '8px', // Rounded corners to match app design
          boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)', // Drop shadow to make dropdown appear elevated
          border: '1px solid #e5e7eb', // Light gray border around dropdown
          minWidth: '200px', // Ensure dropdown is at least 200px wide
          zIndex: 1000 // High z-index to ensure dropdown appears above other page elements
        }}>
          
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              {user?.email}
            </div>
          </div>
          
          <button
            onClick={() => {
              setIsOpen(false); // Close dropdown menu
              onOpenProfile(); // Tell parent component to open profile modal
            }}
            style={{
              width: '100%', // Button spans full width of dropdown
              padding: '12px 16px', // Comfortable padding inside button
              border: 'none', // Remove default button border
              backgroundColor: 'transparent', // Transparent background so dropdown background shows through
              textAlign: 'left', // Left-align text instead of centering
              cursor: 'pointer', // Show pointer cursor when hovering
              fontSize: '14px', // Small readable text
              color: '#374151', // Dark gray text color
              display: 'flex', // Use flexbox to align icon and text
              alignItems: 'center', // Vertically center icon and text
              gap: '8px' // 8px space between icon and text
            }}
            onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f9fafb'} // Light gray background when hovering
            onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'} // Return to transparent when not hovering
          >
            👤 Profile
          </button>

          <button
            onClick={() => {
              setIsOpen(false); // Close dropdown menu
              onGoToSettings(); // Tell parent component to open settings
            }}
            style={{
              width: '100%', // Button spans full width of dropdown
              padding: '12px 16px', // Comfortable padding inside button
              border: 'none', // Remove default button border
              backgroundColor: 'transparent', // Transparent background
              textAlign: 'left', // Left-align text
              cursor: 'pointer', // Show pointer cursor when hovering
              fontSize: '14px', // Small readable text
              color: '#374151', // Dark gray text color
              display: 'flex', // Use flexbox to align icon and text
              alignItems: 'center', // Vertically center icon and text
              gap: '8px', // 8px space between icon and text
              borderBottom: '1px solid #f3f4f6' // Light border below this item to separate from logout
            }}
            onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#f9fafb'} // Light gray background when hovering
            onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'} // Return to transparent when not hovering
          >
            ⚙️ Settings
          </button>

          <button
            onClick={() => {
              setIsOpen(false); // Close dropdown menu
              onLogout(); // Tell parent component to log user out
            }}
            style={{
              width: '100%', // Button spans full width of dropdown
              padding: '12px 16px', // Comfortable padding inside button
              border: 'none', // Remove default button border
              backgroundColor: 'transparent', // Transparent background
              textAlign: 'left', // Left-align text
              cursor: 'pointer', // Show pointer cursor when hovering
              fontSize: '14px', // Small readable text
              color: '#dc2626', // Red text color to indicate destructive action
              display: 'flex', // Use flexbox to align icon and text
              alignItems: 'center', // Vertically center icon and text
              gap: '8px' // 8px space between icon and text
            }}
            onMouseEnter={(e) => (e.target as HTMLElement).style.backgroundColor = '#fef2f2'} // Light red background when hovering (matches red text)
            onMouseLeave={(e) => (e.target as HTMLElement).style.backgroundColor = 'transparent'} // Return to transparent when not hovering
          >
            🚪 Logout
          </button>
        </div>
      )}
    </div>
  );
}

// COMPONENT SUMMARY:
// PURPOSE: Creates a dropdown menu that appears when user clicks their profile button, providing access to profile, settings, and logout
// MEMORY: Tracks whether dropdown is open/closed and maintains reference to dropdown element for click-outside detection
// BEHAVIOR: Opens/closes dropdown on button click, closes when clicking outside, and calls appropriate parent functions when menu items are clicked
// APPEARANCE: Displays round purple profile button that shows/hides a white dropdown menu with three options
// INTERACTION: Handles hover effects on menu items and proper cleanup of event listeners
// COMMUNICATION: Uses props to receive user data and callback functions from parent component
