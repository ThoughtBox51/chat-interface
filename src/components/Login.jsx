import { useState } from 'react'
import { authService } from '../services/auth.service'
import './Login.css'

function Login({ onLogin }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          setLoading(false)
          return
        }
        
        const response = await authService.register({ name, email, password })
        alert(response.message || 'Registration successful! Awaiting admin approval.')
        setIsSignUp(false)
      } else {
        const response = await authService.login({ email, password })
        onLogin(response.user)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred')
    } finally {
      setLoading(false)
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
          
          {error && <p className="error-message">{error}</p>}
          
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
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
