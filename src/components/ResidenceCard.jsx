import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MediaGallery from './MediaGallery';
import './ResidenceCard.css';

// Configuration de l'API URL avec détection d'environnement améliorée
const getApiUrl = () => {
  const hostname = window.location.hostname;
  
  console.log('🌐 Détection environnement:', {
    hostname,
    isRender: hostname.includes('onrender.com'),
    isLocal: hostname.includes('localhost')
  });

  // En production sur Render
  if (hostname.includes('onrender.com')) {
    return 'https://ema-v3-backend.onrender.com';
  }
  
  // En développement local
  return import.meta.env.VITE_API_URL || 'http://localhost:5000';
};

const API_URL = getApiUrl();

export default function ResidenceCard({ residence, onEdit, onDelete, user }) {
  const navigate = useNavigate();
  const [showGallery, setShowGallery] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);

  // Logs de débogage améliorés
  console.log('=== ResidenceCard Debug ===');
  console.log('Residence ID:', residence._id);
  console.log('Media count:', residence.media?.length);
  const firstMedia = residence.media?.[0];
  console.log('First media:', firstMedia);
  console.log('API URL:', API_URL);

  useEffect(() => {
    if (firstMedia) {
      const url = getMediaUrl(firstMedia);
      setCurrentImageUrl(url);
      console.log('Media URL:', url);
      console.log('Media info:', firstMedia);
    }
  }, [firstMedia]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA';
  };

  // Fonction simplifiée et robuste pour obtenir l'URL d'un média
  const getMediaUrl = (media) => {
    if (!media?.url) {
      console.warn('❌ Media URL manquante:', media);
      return null;
    }
    
    let mediaUrl;
    
    // Si l'URL est déjà complète (commence par http)
    if (media.url.startsWith('http')) {
      mediaUrl = media.url;
    } else {
      // Nettoyer l'URL de tout slash en début
      const cleanUrl = media.url.replace(/^\/+/, '');
      
      // Construction simple de l'URL
      if (cleanUrl.startsWith('uploads/')) {
        mediaUrl = `${API_URL}/${cleanUrl}`;
      } else {
        // Par défaut, ajouter uploads/
        mediaUrl = `${API_URL}/uploads/${cleanUrl}`;
      }
    }
    
    console.log('🔗 URL Media:', {
      original: media.url,
      final: mediaUrl,
      baseUrl: API_URL
    });
    
    return mediaUrl;
  };

  // Fonction synchrone pour gérer les erreurs d'image
  const handleImageError = (e, media) => {
    console.error('❌ Erreur chargement image:', {
      urlTentee: e.target.src,
      mediaOriginal: media,
      networkState: e.target.networkState,
      readyState: e.target.readyState
    });
    
    // Essayer une URL alternative immédiatement
    const cleanUrl = media.url.replace(/^\/+/, '');
    let alternativeUrl = null;
    
    if (e.target.src.includes('/uploads/')) {
      // Si uploads/ a échoué, essayer sans uploads/
      alternativeUrl = `${API_URL}/${cleanUrl}`;
    } else {
      // Si sans uploads/ a échoué, essayer avec uploads/
      alternativeUrl = `${API_URL}/uploads/${cleanUrl}`;
    }
    
    // Test de l'URL alternative
    if (alternativeUrl && alternativeUrl !== e.target.src) {
      console.log('🔄 Tentative URL alternative:', alternativeUrl);
      e.target.src = alternativeUrl;
      return;
    }
    
    console.error('❌ Toutes les tentatives ont échoué');
    setImageError(true);
  };

  // Fonction pour tester une URL d'image
  const testImageUrl = async (url) => {
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        timeout: 5000 
      });
      console.log(`🧪 Test URL ${url}:`, response.ok ? '✅' : '❌', response.status);
      return response.ok;
    } catch (error) {
      console.log(`🧪 Test URL ${url}: ❌ Erreur`, error.message);
      return false;
    }
  };

  // Fonction pour gérer le clic sur l'image
  const handleImageClick = () => {
    navigate(`/residence/${residence._id}`);
  };

  // Fonction pour gérer le clic sur la galerie
  const handleGalleryClick = (e) => {
    e.stopPropagation();
    setShowGallery(true);
  };

  // Test de connectivité avec l'API amélioré
  const testApiConnection = async () => {
    console.log('🔍 Test de connectivité API...');
    console.log('🌐 Base URL testée:', API_URL);
    
    try {
      // Test endpoint de santé
      const healthUrls = [
        `${API_URL}/health`,
        `${API_URL}/api/health`,
        `${API_URL}/`,
        `${API_URL}/api/`
      ];

      for (const url of healthUrls) {
        try {
          const response = await fetch(url, { timeout: 5000 });
          console.log(`🧪 ${url}:`, response.ok ? '✅' : '❌', response.status);
          if (response.ok) break;
        } catch (err) {
          console.log(`🧪 ${url}: ❌ Erreur de connexion`);
        }
      }

      // Test spécifique pour les médias si on a un média
      if (firstMedia) {
        const mediaUrl = getMediaUrl(firstMedia);
        if (mediaUrl) {
          await testImageUrl(mediaUrl);
        }
      }
      
    } catch (error) {
      console.error('❌ Tests de connectivité échoués:', error);
    }
  };

  // Exécuter le test au montage du composant
  useEffect(() => {
    testApiConnection();
  }, []);

  // Fonction pour recharger l'image
  const retryLoadImage = () => {
    setImageError(false);
    if (firstMedia) {
      const newUrl = getMediaUrl(firstMedia);
      setCurrentImageUrl(newUrl + '?retry=' + Date.now()); // Force le rechargement
    }
  };

  return (
    <div className="residence-card">
      <div className="card-image-wrapper" onClick={handleImageClick}>
        {firstMedia && !imageError ? (
          firstMedia.type === 'image' ? (
            <img
              className="card-image"
              src={currentImageUrl}
              alt={residence.title}
              onError={(e) => handleImageError(e, firstMedia)}
              onLoad={() => {
                console.log('✅ Image chargée avec succès:', currentImageUrl);
                setImageError(false);
              }}
              loading="lazy"
              crossOrigin="anonymous"
            />
          ) : (
            <video
              className="card-image"
              src={currentImageUrl}
              poster={firstMedia.thumbnail ? getMediaUrl(firstMedia.thumbnail) : undefined}
              onError={(e) => handleImageError(e, firstMedia)}
              onLoadedData={() => {
                console.log('✅ Vidéo chargée avec succès:', currentImageUrl);
              }}
              crossOrigin="anonymous"
            />
          )
        ) : (
          <div className="card-placeholder">
            {imageError ? (
              <div className="error-content">
                <div>❌ Erreur de chargement</div>
                <div style={{ fontSize: '12px', margin: '10px 0', wordBreak: 'break-all' }}>
                  URL: {currentImageUrl}
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    retryLoadImage();
                  }}
                  style={{ 
                    padding: '5px 10px', 
                    fontSize: '12px',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Réessayer
                </button>
              </div>
            ) : (
              '📷 Aucun média'
            )}
          </div>
        )}

        {/* Bouton pour ouvrir la galerie */}
        {residence.media?.length > 1 && (
          <button 
            className="gallery-btn"
            onClick={handleGalleryClick}
            title="Voir toutes les photos"
          >
            📷 {residence.media.length}
          </button>
        )}

        {user?.role === 'owner' && (
          <div className="card-actions">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }} 
              className="btn btn-edit" 
              title="Modifier"
            >
              ✏️
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }} 
              className="btn btn-delete" 
              title="Supprimer"
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      <div className="card-content">
        <h3 onClick={handleImageClick} className="clickable-title">{residence.title}</h3>
        <p className="price">{formatPrice(residence.price)}</p>
        <p className="location">📍 {residence.location}</p>
        <button
          onClick={() => navigate(`/residence/${residence._id}`)}
          className="btn btn-detail"
        >
          Voir les disponibilités
        </button>
      </div>

      {/* Galerie d'images/vidéos */}
      {showGallery && (
        <MediaGallery
          media={residence.media || []}
          onClose={() => setShowGallery(false)}
          getMediaUrl={getMediaUrl}
        />
      )}
    </div>
  );
}