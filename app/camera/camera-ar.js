import { useNavigation } from '@react-navigation/native';
import { useCameraPermissions } from 'expo-camera';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import WebView from 'react-native-webview';

const API_KEY = "689f7161-2352-4fe3-8334-8e1cae8bffb7";
const POSETRACKER_API = "https://app.posetracker.com/pose_tracker/tracking";
const { width, height } = Dimensions.get('window');

// Modelo 3D de referencia para sentadilla
const SQUAT_IMAGE = require('./../../assets/images/lower1.png'); // Asegúrate de tener esta imagen en tu proyecto

export default function CameraAR() {
  const [poseTrackerInfos, setCurrentPoseTrackerInfos] = useState(null);
  const [repsCounter, setRepsCounter] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const [exerciseStartTime] = useState(new Date());
  const [repHistory, setRepHistory] = useState([]);
  const [showModel, setShowModel] = useState(false);
  const navigation = useNavigation();
  
  // Animaciones
  const arrowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission?.granted, requestPermission]);

  useEffect(() => {
    // Animación de flechas
    if (poseTrackerInfos?.postureDirection) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(arrowAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(arrowAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      arrowAnim.setValue(0);
    }

    // Animación de pulso para feedback positivo
    if (poseTrackerInfos?.ready) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [poseTrackerInfos, arrowAnim, pulseAnim]);

  const exercise = "squat";
  const difficulty = "easy";

  const posetracker_url = `${POSETRACKER_API}?token=${API_KEY}&exercise=${exercise}&difficulty=${difficulty}&width=${width}&height=${height}`;

  const jsBridge = `
    window.addEventListener('message', function(event) {
      window.ReactNativeWebView.postMessage(JSON.stringify(event.data));
    });

    window.webViewCallback = function(data) {
      window.ReactNativeWebView.postMessage(JSON.stringify(data));
    };

    const originalPostMessage = window.postMessage;
    window.postMessage = function(data) {
      window.ReactNativeWebView.postMessage(typeof data === 'string' ? data : JSON.stringify(data));
    };

    true;
  `;

  const handleCounter = (count) => {
    setRepsCounter(count);
  };

  const handleInfos = (infos) => {
    setCurrentPoseTrackerInfos(infos);
    
    // Registrar calidad de repetición
    if (infos.type === 'pose' && infos.quality) {
      setRepHistory(prev => [...prev, infos.quality]);
    }
  };

  const webViewCallback = (info) => {
    if (info?.type === 'counter') {
      handleCounter(info.current_count);
    } else {
      handleInfos(info);
    }
  };

  const onMessage = (event) => {
    try {
      let parsedData;
      if (typeof event.nativeEvent.data === 'string') {
        parsedData = JSON.parse(event.nativeEvent.data);
      } else {
        parsedData = event.nativeEvent.data;
      }
      webViewCallback(parsedData);
    } catch (error) {
      console.error('Error processing message:', error);
    }
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const handleFinishExercise = () => {
    const exerciseEndTime = new Date();
    const durationInSeconds = Math.round((exerciseEndTime - exerciseStartTime) / 1000);
    const formattedDuration = formatDuration(durationInSeconds);
    
    const exerciseStats = {
      exercise: exercise.charAt(0).toUpperCase() + exercise.slice(1),
      difficulty: difficulty,
      reps: repsCounter,
      duration: formattedDuration,
      durationInSeconds: durationInSeconds,
      repQualityHistory: repHistory,
      averageQuality: repHistory.length > 0 ? 
        (repHistory.reduce((a, b) => a + b, 0) / repHistory.length).toFixed(2) : 0,
      startTime: exerciseStartTime,
      endTime: exerciseEndTime,
      date: new Date().toISOString().split('T')[0],
      dayOfWeek: new Date().toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '')
    };

    Alert.alert(
      "¡Ejercicio Completado!",
      `✅ ${exerciseStats.reps} repeticiones\n⏱️ ${exerciseStats.duration}\n⭐ Calidad promedio: ${exerciseStats.averageQuality}/1.0`,
      [
        {
          text: "Ver Detalles",
          onPress: () => {
            navigation.navigate('Dashboard', { 
              exerciseStats: exerciseStats,
              fromExercise: true,
              justCompleted: true
            });
          }
        },
        {
          text: "Cerrar",
          style: "cancel"
        }
      ]
    );
  };

  const getPostureFeedback = (infos) => {
    if (!infos) return "Posicionándose...";
    
    if (infos.type === 'placement') {
      const direction = infos.postureDirection || '';
      const distance = infos.distance ? Math.round(infos.distance * 100) : '';
      
      if (direction.includes('backward')) return `Retrocede ${distance}cm`;
      if (direction.includes('forward')) return `Acércate ${distance}cm`;
      if (direction.includes('left')) return `Muévete a la derecha`;
      if (direction.includes('right')) return `Muévete a la izquierda`;
      if (direction.includes('higher')) return `Ponte más alto`;
      if (direction.includes('lower')) return `Agáchate más`;
    }
    
    if (infos.type === 'pose') {
      if (infos.message?.includes('knees')) return "Rodillas no deben pasar los dedos";
      if (infos.message?.includes('back')) return "Espalda recta";
      if (infos.message?.includes('depth')) return "Baja más para completar";
      if (infos.message?.includes('balance')) return "Mantén el equilibrio";
    }
    
    return "Ajusta tu postura";
  };

  const getArrowDirection = () => {
    if (!poseTrackerInfos?.postureDirection) return null;
    
    const direction = poseTrackerInfos.postureDirection.toLowerCase();
    
    if (direction.includes('left')) return "←";
    if (direction.includes('right')) return "→";
    if (direction.includes('forward')) return "↓";
    if (direction.includes('backward')) return "↑";
    if (direction.includes('higher')) return "↑";
    if (direction.includes('lower')) return "↓";
    
    return null;
  };

  const renderArrowAnimation = () => {
    const arrow = getArrowDirection();
    if (!arrow) return null;

    const translateValue = arrowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 20]
    });

    return (
      <Animated.View 
        style={[
          styles.arrowContainer,
          { 
            transform: [
              { translateX: ['←','→'].includes(arrow) ? translateValue : 0 },
              { translateY: ['↑','↓'].includes(arrow) ? translateValue : 0 }
            ] 
          }
        ]}
      >
        <Text style={styles.arrowText}>{arrow}</Text>
      </Animated.View>
    );
  };

  const renderModelReference = () => {
    if (!showModel) return null;

    return (
      <Animated.View 
        style={[
          styles.modelContainer,
          { opacity: fadeAnim, transform: [{ scale: pulseAnim }] }
        ]}
      >
        <Image source={SQUAT_IMAGE} style={styles.modelImage} />
        <Text style={styles.modelText}>Postura Correcta</Text>
      </Animated.View>
    );
  };

  const renderRepQualityChart = () => {
    if (repHistory.length < 2) return null;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Calidad de Repeticiones</Text>
        <LineChart
          data={{
            labels: repHistory.map((_, i) => (i+1).toString()),
            datasets: [
              {
                data: repHistory,
                color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                strokeWidth: 2
              }
            ]
          }}
          width={width - 40}
          height={160}
          chartConfig={{
            backgroundGradientFrom: '#f9f9f9',
            backgroundGradientTo: '#f9f9f9',
            decimalPlaces: 2,
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: '#007AFF'
            }
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16
          }}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <WebView
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        style={styles.webView}
        source={{ uri: posetracker_url }}
        originWhitelist={['*']}
        injectedJavaScript={jsBridge}
        onMessage={onMessage}
        mixedContentMode="compatibility"
      />
      
      {/* Overlay de información */}
      <View style={styles.overlay}>
        {/* Contador y feedback */}
        <Animated.View style={[styles.infoBox, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.counterText}>{repsCounter}</Text>
          <Text style={styles.counterLabel}>REPETICIONES</Text>
          
          <View style={styles.feedbackBox}>
            <Text style={styles.feedbackText}>
              {getPostureFeedback(poseTrackerInfos)}
            </Text>
          </View>
        </Animated.View>

        {/* Flechas animadas */}
        {renderArrowAnimation()}

        {/* Modelo 3D de referencia */}
        {renderModelReference()}

        {/* Gráfico de calidad */}
        {renderRepQualityChart()}

        {/* Botones de control */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity 
            style={styles.modelButton}
            onPress={() => {
              setShowModel(!showModel);
              Animated.timing(fadeAnim, {
                toValue: showModel ? 0 : 1,
                duration: 300,
                useNativeDriver: true,
              }).start();
            }}
          >
            <Text style={styles.modelButtonText}>
              {showModel ? 'OCULTAR MODELO' : 'MOSTRAR MODELO'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.finishButton}
            onPress={handleFinishExercise}
          >
            <Text style={styles.finishButtonText}>FINALIZAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  webView: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    paddingTop: 50,
    justifyContent: 'space-between',
  },
  infoBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    alignSelf: 'center',
  },
  counterText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  counterLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
  },
  feedbackBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 10,
    marginTop: 5,
    minWidth: 200,
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
  },
  arrowContainer: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
  },
  arrowText: {
    fontSize: 60,
    color: 'rgba(255, 255, 0, 0.8)',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  modelContainer: {
    position: 'absolute',
    top: '20%',
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  modelImage: {
    width: 100,
    height: 150,
    resizeMode: 'contain',
  },
  modelText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 5,
  },
  chartContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modelButton: {
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  modelButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  finishButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  finishButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});