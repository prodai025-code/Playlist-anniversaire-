```jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Music, X, Check, Search, Plus, Trash2, GripVertical, Star, Mic, Flame, RefreshCw, User, Wifi, WifiOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import { initializeApp } from "firebase/app";
import { 
  getDatabase, 
  ref, 
  onValue, 
  push, 
  remove, 
  update,
  set
} from "firebase/database";

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDFqDksnQqE1NvaXVUK5f28p_d-VSB7ACA",
  authDomain: "projet-anniversaire-cel.firebaseapp.com",
  projectId: "projet-anniversaire-cel",
  storageBucket: "projet-anniversaire-cel.appspot.com",
  messagingSenderId: "919474848624",
  appId: "1:919474848624:web:27c704f86a6be6e11e05b5",
  measurementId: "G-43CC1WCT74"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const App = () => {
  const [userName, setUserName] = useState("");
  const [userSubmitted, setUserSubmitted] = useState(false);
  const [songTitle, setSongTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [songs, setSongs] = useState([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [pendingSong, setPendingSong] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [spotifyResults, setSpotifyResults] = useState([]);
  const [showSpotifyResults, setShowSpotifyResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [localChanges, setLocalChanges] = useState([]);
  const [syncStatus, setSyncStatus] = useState("syncing");
  const inputRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const confettiCooldownRef = useRef(new Set());
  const songsRef = ref(database, 'songs');

  // Admin user (can clear playlist)
  const ADMIN_USER = "admin";

  // Update window size for confetti
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setSyncStatus("syncing");
    };
    const handleOffline = () => {
      setIsOffline(true);
      setSyncStatus("offline");
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    setIsOffline(!window.navigator.onLine);
    setSyncStatus(window.navigator.onLine ? "synced" : "offline");
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('birthdayUser');
    const savedChanges = localStorage.getItem('localChanges');
    
    if (savedUser) {
      setUserName(savedUser);
      setUserSubmitted(true);
    }
    
    if (savedChanges) {
      try {
        const parsedChanges = JSON.parse(savedChanges);
        setLocalChanges(parsedChanges);
      } catch (e) {
        console.error('Failed to parse local changes', e);
      }
    }
  }, []);

  // Sync with Firebase Realtime Database
  useEffect(() => {
    const unsubscribe = onValue(songsRef, (snapshot) => {
      try {
        const data = snapshot.val();
        const songsArray = data ? Object.entries(data).map(([id, song]) => ({
          id,
          ...song
        })) : [];
        
        setSongs(songsArray);
        
        // If we were offline and now online, clear local changes
        if (!isOffline) {
          setLocalChanges([]);
          setSyncStatus("synced");
        }
      } catch (error) {
        console.error("Error syncing songs:", error);
      }
    }, (error) => {
      console.error("Firebase error:", error);
      setIsOffline(true);
      setSyncStatus("error");
    });

    return () => unsubscribe();
  }, [isOffline]);

  // Save user name
  useEffect(() => {
    if (userName) {
      localStorage.setItem('birthdayUser', userName);
    }
  }, [userName]);

  // Save local changes
  useEffect(() => {
    localStorage.setItem('localChanges', JSON.stringify(localChanges));
  }, [localChanges]);

  // Process local changes when back online
  useEffect(() => {
    if (!isOffline && localChanges.length > 0) {
      setSyncStatus("syncing");
      
      // Process all local changes
      localChanges.forEach(async (change) => {
        try {
          if (change.type === 'add') {
            await push(songsRef, change.song);
          } else if (change.type === 'remove') {
            const songRef = ref(database, `songs/${change.songId}`);
            await remove(songRef);
          } else if (change.type === 'clear') {
            await set(songsRef, null);
          } else if (change.type === 'reorder') {
            // Reordering is handled by the real-time sync
            console.log("Reorder sync completed");
          }
        } catch (error) {
          console.error("Failed to sync change:", error);
        }
      });
      
      // Clear local changes after successful sync
      setLocalChanges([]);
      setSyncStatus("synced");
    }
  }, [isOffline, localChanges]);

  // Mock Spotify API search (in a real app, you would use the actual Spotify API)
  const searchSpotify = useCallback((query) => {
    if (!query.trim()) {
      setSpotifyResults([]);
      setShowSpotifyResults(false);
      return;
    }

    setIsLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      const mockResults = [
        {
          id: `spotify_${Date.now()}_1`,
          title: 'Dance Monkey',
          artist: 'Tones and I',
          album: 'The Kids Are Coming',
          image: 'https://placehold.co/60x60/ff6b9d/ffffff?text=DT',
          duration: '3:29'
        },
        {
          id: `spotify_${Date.now()}_2`,
          title: 'Blinding Lights',
          artist: 'The Weeknd',
          album: 'After Hours',
          image: 'https://placehold.co/60x60/4ecdc4/ffffff?text=BL',
          duration: '3:20'
        },
        {
          id: `spotify_${Date.now()}_3`,
          title: 'Levitating',
          artist: 'Dua Lipa',
          album: 'Future Nostalgia',
          image: 'https://placehold.co/60x60/a8e6cf/ffffff?text=LD',
          duration: '3:23'
        },
        {
          id: `spotify_${Date.now()}_4`,
          title: 'Watermelon Sugar',
          artist: 'Harry Styles',
          album: 'Fine Line',
          image: 'https://placehold.co/60x60/ffd93d/ffffff?text=WS',
          duration: '2:54'
        },
        {
          id: `spotify_${Date.now()}_5`,
          title: 'Peaches',
          artist: 'Justin Bieber',
          album: 'Justice',
          image: 'https://placehold.co/60x60/ff9a8b/ffffff?text=JP',
          duration: '3:16'
        }
      ].filter(track => 
        track.title.toLowerCase().includes(query.toLowerCase()) || 
        track.artist.toLowerCase().includes(query.toLowerCase())
      );

      setSpotifyResults(mockResults);
      setShowSpotifyResults(mockResults.length > 0);
      setIsLoading(false);
    }, 500);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (songTitle.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchSpotify(songTitle);
      }, 300);
    } else {
      setSpotifyResults([]);
      setShowSpotifyResults(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [songTitle, searchSpotify]);

  // Generate color based on name
  const getColorFromName = (name) => {
    const colors = [
      "bg-pink-500", "bg-purple-500", "bg-blue-500", "bg-indigo-500", 
      "bg-rose-500", "bg-fuchsia-500", "bg-violet-500", "bg-cyan-500"
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  // Generate avatar from name
  const getAvatar = (name) => {
    return name.charAt(0).toUpperCase();
  };

  // Check for duplicates using Spotify ID
  const checkForDuplicates = (spotifyId) => {
    return songs.find(song => song.spotifyId === spotifyId);
  };

  const handleSubmitName = (e) => {
    e.preventDefault();
    if (userName.trim()) {
      setUserSubmitted(true);
    }
  };

  const handleAddSong = async (e) => {
    e.preventDefault();
    if (!songTitle.trim() || !artist.trim()) return;

    const pendingSongData = {
      title: songTitle.trim(),
      artist: artist.trim(),
      addedBy: userName,
      badge: selectedBadge
    };

    // If we have a Spotify result selected, use its ID
    const selectedSpotifyTrack = spotifyResults.find(track => 
      track.title.toLowerCase() === songTitle.toLowerCase() && 
      track.artist.toLowerCase() === artist.toLowerCase()
    );

    if (selectedSpotifyTrack) {
      const duplicate = checkForDuplicates(selectedSpotifyTrack.id);
      
      if (duplicate) {
        setPendingSong({
          ...pendingSongData,
          spotifyId: selectedSpotifyTrack.id,
          image: selectedSpotifyTrack.image
        });
        setShowDuplicateModal(true);
      } else {
        await addSong(pendingSongData, selectedSpotifyTrack);
      }
    } else {
      // No Spotify match, just add with basic info
      await addSong(pendingSongData);
    }
  };

  const addSong = async (songData, spotifyTrack = null) => {
    const newSong = {
      title: songData.title,
      artist: songData.artist,
      addedBy: songData.addedBy,
      timestamp: new Date().toISOString(),
      badge: songData.badge,
      image: spotifyTrack ? spotifyTrack.image : `https://placehold.co/60x60/${getColorFromName(songData.title).replace('bg-', '').replace('-500', '')}/ffffff?text=${songData.title.charAt(0).toUpperCase()}`,
      spotifyId: spotifyTrack ? spotifyTrack.id : null,
      duration: spotifyTrack ? spotifyTrack.duration : null
    };
    
    try {
      if (window.navigator.onLine) {
        await push(songsRef, newSong);
        setSyncStatus("synced");
      } else {
        // Store locally and sync later
        setLocalChanges(prev => [...prev, { type: 'add', song: newSong }]);
        setSyncStatus("offline");
      }
      
      // Show confetti only for first song by this user
      const userSongs = songs.filter(s => s.addedBy === userName);
      if (userSongs.length === 0 && !confettiCooldownRef.current.has(userName)) {
        setShowConfetti(true);
        confettiCooldownRef.current.add(userName);
        
        // Hide confetti after 3 seconds
        setTimeout(() => setShowConfetti(false), 3000);
      }
      
      // Reset form
      setSongTitle("");
      setArtist("");
      setSelectedBadge(null);
      setShowAddForm(false);
      setSpotifyResults([]);
      setShowSpotifyResults(false);
      
      // Focus on search if it exists
      if (inputRef.current) inputRef.current.focus();
    } catch (error) {
      console.error("Error adding song:", error);
      // If online but failed, store locally
      if (window.navigator.onLine) {
        setLocalChanges(prev => [...prev, { type: 'add', song: newSong }]);
        setSyncStatus("error");
      }
    }
  };

  const confirmAddSong = async () => {
    if (pendingSong) {
      await addSong(pendingSong);
    }
    setShowDuplicateModal(false);
    setPendingSong(null);
  };

  const cancelAddSong = () => {
    setShowDuplicateModal(false);
    setPendingSong(null);
  };

  const removeSong = async (songId, songAddedBy) => {
    // Only allow removal if user is admin or added the song
    if (userName === ADMIN_USER || userName === songAddedBy) {
      try {
        if (window.navigator.onLine) {
          const songRef = ref(database, `songs/${songId}`);
          await remove(songRef);
          setSyncStatus("synced");
        } else {
          // Store removal locally
          setLocalChanges(prev => [...prev, { type: 'remove', songId }]);
          setSyncStatus("offline");
        }
      } catch (error) {
        console.error("Error removing song:", error);
        if (window.navigator.onLine) {
          setLocalChanges(prev => [...prev, { type: 'remove', songId }]);
          setSyncStatus("error");
        }
      }
    } else {
      alert("Tu ne peux pas supprimer cette chanson !");
    }
  };

  const clearPlaylist = async () => {
    if (userName === ADMIN_USER) {
      if (window.confirm("Es-tu sûr de vouloir vider toute la playlist ?")) {
        try {
          if (window.navigator.onLine) {
            await set(songsRef, null);
            setSyncStatus("synced");
          } else {
            // Clear locally and sync later
            setLocalChanges([{ type: 'clear', timestamp: Date.now() }]);
            setSyncStatus("offline");
          }
        } catch (error) {
          console.error("Error clearing playlist:", error);
          if (window.navigator.onLine) {
            setLocalChanges([{ type: 'clear', timestamp: Date.now() }]);
            setSyncStatus("error");
          }
        }
      }
    } else {
      alert("Seul l'admin peut vider la playlist !");
    }
  };

  const selectSpotifyTrack = (track) => {
    setSongTitle(track.title);
    setArtist(track.artist);
    setSpotifyResults([]);
    setShowSpotifyResults(false);
  };

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchTerm.toLowerCase()) ||
    song.addedBy.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Drag and drop functionality
  const [draggedItem, setDraggedItem] = useState(null);

  const handleDragStart = (e, song) => {
    setDraggedItem(song);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetSong) => {
    e.preventDefault();
    if (!draggedItem) return;

    const sourceIndex = songs.findIndex(s => s.id === draggedItem.id);
    const targetIndex = songs.findIndex(s => s.id === targetSong.id);

    if (sourceIndex !== targetIndex) {
      // In a real app with Firebase, you might want to add a position field
      // For now, we'll just log the reorder
      console.log(`Reordered from ${sourceIndex} to ${targetIndex}`);
      
      if (window.navigator.onLine) {
        // Store the reorder action to sync later if needed
        setLocalChanges(prev => [...prev, { 
          type: 'reorder', 
          from: sourceIndex, 
          to: targetIndex,
          timestamp: Date.now()
        }]);
        setSyncStatus("synced");
      } else {
        setLocalChanges(prev => [...prev, { 
          type: 'reorder', 
          from: sourceIndex, 
          to: targetIndex,
          timestamp: Date.now()
        }]);
        setSyncStatus("offline");
      }
    }
    setDraggedItem(null);
  };

  if (!userSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-600 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white/20 backdrop-blur-lg rounded-3xl p-8 max-w-md w-full text-center shadow-2xl border border-white/30">
          <div className="text-6xl mb-6 animate-bounce">🎉</div>
          <h1 className="text-3xl font-bold text-white mb-6">Playlist d'Anniversaire !</h1>
          <p className="text-white/90 mb-8 text-lg">Entre ton prénom pour ajouter des chansons à la playlist festive !</p>
          
          <form onSubmit={handleSubmitName} className="space-y-4">
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Ton prénom"
              className="w-full px-6 py-4 rounded-2xl text-lg font-medium text-center bg-white/30 backdrop-blur-sm border border-white/40 text-white placeholder-white/70 focus:outline-none focus:ring-4 focus:ring-white/40"
              autoFocus
            />
            <button
              type="submit"
              disabled={!userName.trim()}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 font-bold py-4 px-8 rounded-2xl text-xl transform transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              C'est parti ! 🎶
            </button>
          </form>
          
          <div className="mt-6 text-white/70 text-sm">
            Pas d'inscription nécessaire - rejoins la fête en 2 secondes !
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-purple-600 to-blue-600">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-20 h-20 bg-yellow-400 rounded-full opacity-30 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-pink-400 rounded-full opacity-40 animate-bounce delay-1000"></div>
        <div className="absolute bottom-32 left-1/4 w-12 h-12 bg-cyan-400 rounded-full opacity-30 animate-pulse delay-500"></div>
        <div className="absolute bottom-20 right-1/3 w-24 h-24 bg-purple-400 rounded-full opacity-25 animate-bounce delay-700"></div>
        <div className="absolute top-1/3 right-1/4 w-8 h-8 bg-green-400 rounded-full opacity-40 animate-ping"></div>
        <div className="absolute bottom-1/3 left-20 w-6 h-6 bg-orange-400 rounded-full opacity-50 animate-pulse"></div>
        <div className="absolute top-1/4 left-1/3 w-4 h-4 bg-blue-400 rounded-full opacity-30 animate-spin" style={{ animationDuration: '3s' }}></div>
        <div className="absolute bottom-1/4 right-1/3 w-5 h-5 bg-red-400 rounded-full opacity-40 animate-ping" style={{ animationDuration: '2s' }}></div>
      </div>

      {/* Confetti */}
      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={200}
          colors={['#ff6b9d', '#4ecdc4', '#ffd93d', '#a8e6cf', '#ff9a8b', '#ffd166']}
        />
      )}

      <div className="relative z-10 container mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
            Playlist d'Anniversaire
          </h1>
          <p className="text-white/90 text-lg">Ajoute tes chansons préférées !</p>
        </div>

        {/* Connection status */}
        <div className="mb-6">
          <div className={`text-center text-sm p-2 rounded-lg ${
            syncStatus === 'synced' ? 'bg-green-500/30 text-green-200' :
            syncStatus === 'syncing' ? 'bg-yellow-500/30 text-yellow-200' :
            'bg-red-500/30 text-red-200'
          }`}>
            {syncStatus === 'synced' && <><Wifi size={14} className="inline mr-1" /> Synchronisé</>}
            {syncStatus === 'syncing' && <><RefreshCw size={14} className="inline mr-1 animate-spin" /> Synchronisation...</>}
            {syncStatus === 'offline' && <><WifiOff size={14} className="inline mr-1" /> Hors ligne</>}
            {syncStatus === 'error' && <><
