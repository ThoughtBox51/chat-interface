import { useState } from 'react'
import './Login.css'

function Login({ onLogin }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (isSignUp) {
      if (password !== confirmPassword) {
        alert('Passwords do not match')
        return
      }
      if (email && password && name) {
        // For demo: make first user admin
        const role = email === 'admin@example.com' ? 'admin' : 'user'
        onLogin({ email, name, role })
      }
    } else {
      if (email && password) {
        // For demo: admin@example.com is admin
        const role = email === 'admin@example.com' ? 'admin' : 'user'
        onLogin({ email, name: email.split('@')[0], role })
      }
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-logo">
          <span>Logo</span>
        </div>
        <h1>{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
        <p className="login-subtitle">
          {isSignUp ? 'Sign up to get started' : 'Sign in to continue'}
        </p>
        
        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>
          )}
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          
          {isSignUp && (
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                required
              />
            </div>
          )}
          
          <button type="submit" className="login-btn">
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>
        
        <div className="auth-toggle">
          {isSignUp ? (
            <p>
              Already have an account?{' '}
              <span onClick={() => setIsSignUp(false)}>Sign In</span>
            </p>
          ) : (
            <p>
              Don't have an account?{' '}
              <span onClick={() => setIsSignUp(true)}>Sign Up</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login
