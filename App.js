import { useState, useEffect } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
  Appbar,
  Button,
  List,
  PaperProvider,
  Switch,
  Text,
  MD3LightTheme as DefaultTheme,
} from "react-native-paper";
import * as Location from "expo-location"; // Importando expo-location
import * as SQLite from "expo-sqlite"; // Importando expo-sqlite
import AsyncStorage from "@react-native-async-storage/async-storage"; // Importando AsyncStorage
import myColors from "./assets/colors.json";
import myColorsDark from "./assets/colorsDark.json";

const db = SQLite.openDatabase("locations.db"); // Inicializando o banco de dados SQLite

export default function App() {
  const [isSwitchOn, setIsSwitchOn] = useState(false); // Controle do darkMode
  const [isLoading, setIsLoading] = useState(false); // Controle do loading do botão
  const [locations, setLocations] = useState([]); // Armazenar as localizações
  const [theme, setTheme] = useState({
    ...DefaultTheme,
    myOwnProperty: true,
    colors: myColors.colors,
  });

  // Função para carregar o tema darkMode do AsyncStorage
  async function loadDarkMode() {
    try {
      const savedTheme = await AsyncStorage.getItem("theme");
      if (savedTheme !== null) {
        setIsSwitchOn(savedTheme === "dark");
      }
    } catch (error) {
      console.error("Erro ao carregar o tema", error);
    }
  }

  // Evento do switch para alternar o tema
  async function onToggleSwitch() {
    const newTheme = !isSwitchOn;
    setIsSwitchOn(newTheme);
    try {
      await AsyncStorage.setItem("theme", newTheme ? "dark" : "light");
    } catch (error) {
      console.error("Erro ao salvar o tema", error);
    }
  }

  // Função para capturar a localização
  async function getLocation() {
    setIsLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Permissão de localização negada!");
        setIsLoading(false);
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Inserindo a localização no banco de dados
      insertLocation(latitude, longitude);
      loadLocations(); // Atualizando a lista de localizações
    } catch (error) {
      console.error("Erro ao capturar a localização", error);
    }
    setIsLoading(false);
  }

  // Configurando o banco de dados SQLite
  const createTable = () => {
    db.transaction((tx) => {
      tx.executeSql(
        "CREATE TABLE IF NOT EXISTS locations (id INTEGER PRIMARY KEY AUTOINCREMENT, latitude REAL, longitude REAL);"
      );
    });
  };

  // Função para inserir uma nova localização no banco de dados
  const insertLocation = (latitude, longitude) => {
    db.transaction((tx) => {
      tx.executeSql(
        "INSERT INTO locations (latitude, longitude) VALUES (?, ?);",
        [latitude, longitude]
      );
    });
  };

  // Função para carregar as localizações salvas no banco de dados
  const loadLocations = () => {
    setIsLoading(true);
    db.transaction((tx) => {
      tx.executeSql(
        "SELECT * FROM locations;",
        [],
        (_, { rows }) => {
          setLocations(rows._array);
          setIsLoading(false);
        },
        (error) => {
          console.error("Erro ao carregar as localizações", error);
          setIsLoading(false);
        }
      );
    });
  };

  // Use Effect para inicializar o banco de dados, carregar o tema e as localizações
  useEffect(() => {
    createTable();
    loadDarkMode();
    loadLocations();
  }, []);

  // Efetiva a alteração do tema dark/light quando a variável isSwitchOn é alterada
  useEffect(() => {
    setTheme({
      ...theme,
      colors: isSwitchOn ? myColorsDark.colors : myColors.colors,
    });
  }, [isSwitchOn]);

  return (
    <PaperProvider theme={theme}>
      <Appbar.Header>
        <Appbar.Content title="My Location BASE" />
      </Appbar.Header>
      <View style={{ backgroundColor: theme.colors.background }}>
        <View style={styles.containerDarkMode}>
          <Text>Dark Mode</Text>
          <Switch value={isSwitchOn} onValueChange={onToggleSwitch} />
        </View>
        <Button
          style={styles.containerButton}
          icon="map"
          mode="contained"
          loading={isLoading}
          onPress={getLocation}
        >
          Capturar localização
        </Button>

        <FlatList
          style={styles.containerList}
          data={locations}
          renderItem={({ item }) => (
            <List.Item
              title={`Localização ${item.id}`}
              description={`Latitude: ${item.latitude} | Longitude: ${item.longitude}`}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
        />
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  containerDarkMode: {
    margin: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  containerButton: {
    margin: 10,
  },
  containerList: {
    margin: 10,
    height: "100%",
  },
});
