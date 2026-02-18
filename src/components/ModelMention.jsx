import './ModelMention.css'

function ModelMention({ models, onSelectModel, position }) {
  if (!models || models.length === 0) return null

  return (
    <div 
      className="model-mention-dropdown" 
      style={{ 
        bottom: position?.bottom || '60px',
        left: position?.left || '20px'
      }}
    >
      <div className="model-mention-header">Select a model</div>
      <div className="model-mention-list">
        {models.map(model => (
          <div
            key={model.id || model._id}
            className="model-mention-item"
            onClick={() => onSelectModel(model)}
          >
            <span className="model-mention-icon">🤖</span>
            <div className="model-mention-info">
              <div className="model-mention-name">
                {model.display_name || model.name}
              </div>
              <div className="model-mention-description">
                {model.description || 'AI Model'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ModelMention
