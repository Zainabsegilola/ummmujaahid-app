// components/AuthForm.tsx

'use client'; // Tell Next.js this code runs in the user's web browser, not on the server computer
import React, { useState } from 'react'; // Get the React library and the useState tool which lets us remember and update information
import { supabase } from '@/lib/supabase'; // Get our connection to the Supabase database where user accounts are stored

export function AuthForm() { // Create a reusable piece of website called AuthForm that handles user login and signup
  
  // MEMORY VARIABLES - These remember information and when they change, the webpage updates automatically
  const [loading, setLoading] = useState(false); // Remember whether we're currently talking to the database (true=talking, false=ready for user input)
  const [email, setEmail] = useState(''); // Remember what email address the user has typed so far (starts empty)
  const [password, setPassword] = useState(''); // Remember what password the user has typed so far (starts empty)
  const [isSignUp, setIsSignUp] = useState(false); // Remember whether user wants to create new account (true) or login to existing account (false)
  const [message, setMessage] = useState(''); // Remember what success or error message to show the user (starts empty)

  // FORM SUBMISSION HANDLER - This runs when user clicks the submit button
  const handleAuth = async (e: React.FormEvent) => { // Create function that handles form submission, e contains information about what the user clicked
    e.preventDefault(); // Stop the webpage from refreshing (which would erase everything the user typed)
    setLoading(true); // Update our memory: we're now busy talking to the database, so disable the submit button
    setMessage(''); // Clear any old success/error messages from previous attempts

    try { // Start attempting something that might fail (like database being down)
      if (isSignUp) { // Check our memory: does user want to create a new account?
        const { data, error } = await supabase.auth.signUp({ // Ask Supabase database: please create new account with this info, wait for response
          email, // Send the email address the user typed
          password, // Send the password the user typed
          options: { // Additional settings for the new account
            emailRedirectTo: window.location.origin // Tell Supabase: after user confirms email, send them back to our website
          }
        });
        if (error) throw error; // If database said "something went wrong", immediately jump to the error handling section below
        
        if (data.user && !data.user.email_confirmed_at) { // Check response: did database create user but they haven't confirmed their email yet?
          setMessage('Please check your email for a confirmation link!'); // Update our memory: show message telling user to check email
        } else if (data.user) { // Check response: did database successfully create and confirm the user?
          setMessage('Account created successfully!'); // Update our memory: show success message
        }
      } else { // User wants to login to existing account instead of creating new one
        const { data, error } = await supabase.auth.signInWithPassword({ // Ask Supabase database: does this email/password match an existing account?
          email, // Send the email address the user typed
          password, // Send the password the user typed
        });
        if (error) throw error; // If database said "wrong password" or "user not found", jump to error handling
        setMessage('Signed in successfully!'); // Update our memory: show success message since login worked
      }
    } catch (error: any) { // This runs if anything went wrong in the attempt above (wrong password, database down, etc.)
      setMessage('Error: ' + error.message); // Update our memory: show the user what went wrong (like "Invalid email or password")
    } finally { // This always runs after trying to login/signup in our login form, whether it succeeded or failed
      setLoading(false); // Update our memory: we're done talking to database, so re-enable the submit button for user
    }
  };

  // WEBPAGE LAYOUT - This describes what the user sees and how it looks
  return (
    <div style={{
      minHeight: '100vh', // Make container at least as tall as the user's screen
      display: 'flex', // Use flexible layout system to position content
      alignItems: 'center', // Center everything vertically in the container
      justifyContent: 'center', // Center everything horizontally in the container
      backgroundColor: '#f9fafb' // Paint the background light gray color
    }}>
      <div style={{
        backgroundColor: 'white', // Paint this box white so it stands out from gray background
        padding: '32px', // Add 32 pixels of empty space inside the box edges so text doesn't touch borders
        borderRadius: '12px', // Round the corners of the box to look modern
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)', // Add subtle shadow behind box to make it appear elevated
        width: '100%', // Make box expand to fill available space
        maxWidth: '400px' // But never let box get wider than 400 pixels, even on large screens
      }}>
        
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            fontFamily: 'Amiri, "Noto Naskh Arabic", "Times New Roman", serif', // Use fonts that display Arabic text correctly
            direction: 'rtl', // Make text flow right-to-left as Arabic should
            marginBottom: '8px', // Add small space below this text
            textAlign: 'center' // Center the Arabic text horizontally
          }}>
            <div style={{
              fontSize: '28px', // Make text large and prominent
              fontWeight: '700', // Make text very bold
              color: '#8b5cf6', // Color text purple to match app branding
              lineHeight: '1.2', // Set spacing between lines if text wraps
              textShadow: '0 2px 4px rgba(0,0,0,0.1)' // Add subtle shadow behind text for depth
            }}>
              قُرْآنًا
            </div>
            <div style={{
              fontSize: '28px', // Make text large and prominent
              fontWeight: '600', // Make text semi-bold (slightly less bold than first line)
              color: '#a855f7', // Color text lighter purple for visual variety
              lineHeight: '1.2' // Set spacing between lines if text wraps
            }}>
              عَرَبِيًّا
            </div>
          </div>
          
          <p style={{ color: '#6b7280', marginTop: '8px' }}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        <form onSubmit={handleAuth}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block', // Make label take up full width and appear on its own line
              fontSize: '14px', // Make label text small but readable
              fontWeight: '500', // Make label text medium boldness
              marginBottom: '4px', // Add small space between label and input field
              color: '#374151' // Color label text dark gray
            }}>
              Email
            </label>
            <input
              type="email" // Tell browser this should be an email address (enables email validation and special mobile keyboard)
              value={email} // Show whatever email address we're remembering in our memory, so user sees what they've typed
              onChange={(e) => setEmail(e.target.value)} // When user types anything, update our email memory with exactly what they typed
              required // Don't let user submit form unless they've typed something in this field
              style={{
                width: '100%', // Make input field stretch full width of its container
                padding: '12px', // Add empty space inside input field so text doesn't touch edges
                border: '2px solid #e5e7eb', // Draw 2-pixel gray border around input field
                borderRadius: '8px', // Round the corners of input field
                fontSize: '16px', // Make text inside input field large enough to read easily
                outline: 'none' // Remove blue outline that browsers add when field is selected
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block', // Make label take up full width and appear on its own line
              fontSize: '14px', // Make label text small but readable
              fontWeight: '500', // Make label text medium boldness
              marginBottom: '4px', // Add small space between label and input field
              color: '#374151' // Color label text dark gray
            }}>
              Password
            </label>
            <input
              type="password" // Tell browser to hide what user types (shows dots instead of letters for security)
              value={password} // Show dots representing whatever password we're remembering, so user sees they've typed something
              onChange={(e) => setPassword(e.target.value)} // When user types anything, update our password memory with exactly what they typed
              required // Don't let user submit form unless they've typed something in this field
              minLength={6} // Don't let user submit unless password is at least 6 characters long
              style={{
                width: '100%', // Make input field stretch full width of its container
                padding: '12px', // Add empty space inside input field so text doesn't touch edges
                border: '2px solid #e5e7eb', // Draw 2-pixel gray border around input field
                borderRadius: '8px', // Round the corners of input field
                fontSize: '16px', // Make text inside input field large enough to read easily
                outline: 'none' // Remove blue outline that browsers add when field is selected
              }}
            />
          </div>

          <button
            type="submit" // Tell browser: when this button is clicked, submit the entire form
            disabled={loading} // Make button unclickable when we're busy talking to database (prevents user from clicking multiple times)
            style={{
              width: '100%', // Make button stretch full width of its container
              backgroundColor: loading ? '#9ca3af' : '#8b5cf6', // Color button gray when we're busy talking to database, purple when ready for user input
              color: 'white', // Make button text white so it shows up against colored background
              padding: '12px', // Add empty space inside button so text isn't cramped
              borderRadius: '8px', // Round the corners of button to match input fields
              border: 'none', // Remove default button border
              fontSize: '16px', // Make button text large enough to read easily
              fontWeight: '600', // Make button text semi-bold so it stands out
              cursor: loading ? 'not-allowed' : 'pointer' // Show "not allowed" cursor when button disabled, normal pointer when clickable
            }}
          >
            {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            onClick={() => {
              setIsSignUp(!isSignUp); // Update our memory: if currently in signup mode switch to login mode, if in login mode switch to signup mode
              setMessage(''); // Clear any success/error messages since user is starting over
            }}
            style={{
              backgroundColor: 'transparent', // Make background invisible so it doesn't look like a button
              border: 'none', // Remove button border so it looks like text
              color: '#8b5cf6', // Color text purple to match app branding and indicate it's clickable
              cursor: 'pointer', // Show pointer cursor when user hovers to indicate it's clickable
              fontSize: '14px', // Make text small but readable
              textDecoration: 'underline' // Underline text to make it obviously clickable like a web link
            }}
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>

        {message && (
          <div style={{
            marginTop: '16px', // Add space above message so it doesn't touch the toggle link
            padding: '12px', // Add empty space inside container so text doesn't touch edges
            borderRadius: '6px', // Round corners to match other elements
            backgroundColor: message.includes('error') || message.includes('Invalid') 
              ? '#fef2f2' // If message contains "error" or "Invalid", paint background light red to indicate something went wrong
              : '#f0fdf4', // If message doesn't contain error words, paint background light green to indicate success
            color: message.includes('error') || message.includes('Invalid') 
              ? '#dc2626' // If message contains "error" or "Invalid", make text dark red to indicate something went wrong
              : '#059669', // If message doesn't contain error words, make text dark green to indicate success
            fontSize: '14px' // Make message text small but readable
          }}>
            {message}
          </div>
        )}

      </div>
    </div>
  );
}
