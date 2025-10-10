export const SUPPORTED_LANGUAGES = [
  {
    value: "python",
    label: "Python",
    defaultCode: `# BullReckon Trading Strategy Playground
import requests

class BullReckonAPI:
    def __init__(self, api_key=None):
        self.base_url = "http://localhost:3004/api"
        self.api_key = api_key
    
    def get_quote(self, symbol):
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        response = requests.get(f"{self.base_url}/market/quote/{symbol}", headers=headers)
        return response.json()
    
    def get_historical_data(self, symbol, period="1mo"):
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        response = requests.get(f"{self.base_url}/market/historical/{symbol}?period={period}", headers=headers)
        return response.json()
    
    def execute_trade(self, trade_data):
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"} if self.api_key else {"Content-Type": "application/json"}
        response = requests.post(f"{self.base_url}/trades", json=trade_data, headers=headers)
        return response.json()
    
    def run_backtest(self, backtest_data):
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"} if self.api_key else {"Content-Type": "application/json"}
        response = requests.post(f"{self.base_url}/backtest", json=backtest_data, headers=headers)
        return response.json()

# Example usage
api = BullReckonAPI(api_key="your_api_key_here")

# Get quote
quote = api.get_quote("AAPL")
print("Quote:", quote)

# Get historical data
historical = api.get_historical_data("AAPL", "1mo")
print("Historical:", historical)

# Execute trade (example)
trade_data = {
    "symbol": "AAPL",
    "action": "BUY",
    "quantity": 10,
    "price": 150.0,
    "scriptName": "example_strategy"
}
trade_result = api.execute_trade(trade_data)
print("Trade Result:", trade_result)

# Run backtest (example)
backtest_data = {
    "strategyName": "sma_crossover",
    "symbol": "AAPL",
    "startDate": "2023-01-01",
    "endDate": "2023-12-31",
    "initialCapital": 10000,
    "parameters": {"sma_short": 20, "sma_long": 50}
}
backtest_result = api.run_backtest(backtest_data)
print("Backtest Result:", backtest_result)

# Your strategy code here
`,
  },
  {
    value: "javascript",
    label: "JavaScript",
    defaultCode: `// BullReckon Trading Strategy Playground
const BullReckonAPI = class {
  constructor(apiKey = null) {
    this.baseUrl = "http://localhost:3004/api";
    this.apiKey = apiKey;
  }

  async getQuote(symbol) {
    const headers = this.apiKey ? { "Authorization": \`Bearer \${this.apiKey}\` } : {};
    const response = await fetch(\`\${this.baseUrl}/market/quote/\${symbol}\`, { headers });
    return response.json();
  }

  async getHistoricalData(symbol, period = "1mo") {
    const headers = this.apiKey ? { "Authorization": \`Bearer \${this.apiKey}\` } : {};
    const response = await fetch(\`\${this.baseUrl}/market/historical/\${symbol}?period=\${period}\`, { headers });
    return response.json();
  }

  async executeTrade(tradeData) {
    const headers = {
      "Content-Type": "application/json",
      ...(this.apiKey && { "Authorization": \`Bearer \${this.apiKey}\` })
    };
    const response = await fetch(\`\${this.baseUrl}/trades\`, {
      method: "POST",
      headers,
      body: JSON.stringify(tradeData)
    });
    return response.json();
  }

  async runBacktest(backtestData) {
    const headers = {
      "Content-Type": "application/json",
      ...(this.apiKey && { "Authorization": \`Bearer \${this.apiKey}\` })
    };
    const response = await fetch(\`\${this.baseUrl}/backtest\`, {
      method: "POST",
      headers,
      body: JSON.stringify(backtestData)
    });
    return response.json();
  }
};

// Example usage
const api = new BullReckonAPI("your_api_key_here");

// Get quote
(async () => {
  try {
    const quote = await api.getQuote("AAPL");
    console.log("Quote:", quote);

    const historical = await api.getHistoricalData("AAPL", "1mo");
    console.log("Historical:", historical);

    // Execute trade (example)
    const tradeData = {
      symbol: "AAPL",
      action: "BUY",
      quantity: 10,
      price: 150.0,
      scriptName: "example_strategy"
    };
    const tradeResult = await api.executeTrade(tradeData);
    console.log("Trade Result:", tradeResult);

    // Run backtest (example)
    const backtestData = {
      strategyName: "sma_crossover",
      symbol: "AAPL",
      startDate: "2023-01-01",
      endDate: "2023-12-31",
      initialCapital: 10000,
      parameters: { sma_short: 20, sma_long: 50 }
    };
    const backtestResult = await api.runBacktest(backtestData);
    console.log("Backtest Result:", backtestResult);
  } catch (error) {
    console.error("Error:", error);
  }
})();

// Your strategy code here
`,
  },
  {
    value: "typescript",
    label: "TypeScript",
    defaultCode: `// BullReckon Trading Strategy Playground
import axios from 'axios';

interface PriceData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface QuoteData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

class BullReckonAPI {
  constructor(private email: string, private publicKey: string) {
    this.baseURL = 'https://api.bullreckon.com';
  }

  private baseURL: string;

  private getHeaders(method: string, path: string) {
    const timestamp = Date.now().toString();
    return {
      'x-api-email': this.email,
      'x-api-key': this.publicKey,
      'x-api-timestamp': timestamp
    };
  }

  async getQuote(symbol: string): Promise<QuoteData> {
    const path = \`/api/market/quote/\${symbol}\`;
    const headers = this.getHeaders('GET', path);
    const response = await axios.get(\`\${this.baseURL}\${path}\`, { headers });
    return response.data.data;
  }

  async getHistoricalData(symbol: string, period: string = '1mo'): Promise<PriceData[]> {
    const path = \`/api/market/historical/\${symbol}?period=\${period}\`;
    const headers = this.getHeaders('GET', path);
    const response = await axios.get(\`\${this.baseURL}\${path}\`, { headers });
    return response.data.data;
  }

  async executeTrade(
    symbol: string,
    action: 'BUY' | 'SELL',
    quantity: number,
    price: number,
    scriptName: string,
    confidence?: number,
    reason?: string
  ) {
    const path = '/api/trade';
    const headers = this.getHeaders('POST', path);
    const data = {
      symbol,
      action,
      quantity,
      price,
      scriptName,
      ...(confidence && { confidence }),
      ...(reason && { reason })
    };
    const response = await axios.post(\`\${this.baseURL}\${path}\`, data, { headers });
    return response.data;
  }

  async runBacktest(
    strategyName: string,
    symbol: string,
    startDate: string,
    endDate: string,
    initialCapital: number,
    parameters: Record<string, any>
  ) {
    const path = '/api/backtest';
    const headers = this.getHeaders('POST', path);
    const data = {
      strategyName,
      symbol,
      startDate,
      endDate,
      initialCapital,
      parameters
    };
    const response = await axios.post(\`\${this.baseURL}\${path}\`, data, { headers });
    return response.data;
  }
}

// Example Strategy: Bollinger Bands
function calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2) {
  if (prices.length < period) return null;
  
  const sma = prices.slice(-period).reduce((a, b) => a + b) / period;
  const variance = prices.slice(-period).reduce((acc, price) => acc + Math.pow(price - sma, 2), 0) / period;
  const std = Math.sqrt(variance);
  
  return {
    upper: sma + (stdDev * std),
    middle: sma,
    lower: sma - (stdDev * std)
  };
}

async function calculateSignal(api: BullReckonAPI, symbol: string): Promise<'BUY' | 'SELL' | 'HOLD'> {
  try {
    const historical = await api.getHistoricalData(symbol, '3mo');
    if (historical.length < 25) return 'HOLD';
    
    const prices = historical.map(candle => candle.close);
    const currentPrice = prices[prices.length - 1];
    const bands = calculateBollingerBands(prices);
    
    if (!bands) return 'HOLD';
    
    if (currentPrice < bands.lower) return 'BUY';
    if (currentPrice > bands.upper) return 'SELL';
    return 'HOLD';
  } catch (error) {
    console.error('Error calculating signal:', error);
    return 'HOLD';
  }
}

// Initialize API (replace with your credentials)
const api = new BullReckonAPI('your-email@example.com', 'YOUR_PUBLIC_KEY_PEM');

// Test the strategy
(async () => {
  const symbol = 'AAPL';
  const signal = await calculateSignal(api, symbol);
  console.log(\`Signal for \${symbol}: \${signal}\`);
  
  // For backtesting, uncomment:
  // const result = await api.runBacktest('bollinger-bands', symbol, '2023-01-01', '2023-12-31', 10000, { period: 20, stdDev: 2 });
  // console.log('Backtest Result:', result);
})();
`,
  },
  {
    value: "go",
    label: "Go",
    defaultCode: `// BullReckon Trading Strategy Playground
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io/ioutil"
    "net/http"
    "strconv"
    "time"
)

type BullReckonAPI struct {
    email     string
    publicKey string
    baseURL   string
}

func NewBullReckonAPI(email, publicKey string) *BullReckonAPI {
    return &BullReckonAPI{
        email:     email,
        publicKey: publicKey,
        baseURL:   "https://api.bullreckon.com",
    }
}

func (api *BullReckonAPI) getHeaders(method, path string) map[string]string {
    timestamp := strconv.FormatInt(time.Now().UnixNano()/1000000, 10)
    return map[string]string{
        "x-api-email":     api.email,
        "x-api-key":       api.publicKey,
        "x-api-timestamp": timestamp,
    }
}

func (api *BullReckonAPI) GetQuote(symbol string) (map[string]interface{}, error) {
    path := fmt.Sprintf("/api/market/quote/%s", symbol)
    headers := api.getHeaders("GET", path)
    client := &http.Client{}
    req, _ := http.NewRequest("GET", api.baseURL+path, nil)
    for key, value := range headers {
        req.Header.Set(key, value)
    }
    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    return result, nil
}

func (api *BullReckonAPI) GetHistoricalData(symbol, period string) (map[string]interface{}, error) {
    path := fmt.Sprintf("/api/market/historical/%s?period=%s", symbol, period)
    headers := api.getHeaders("GET", path)
    client := &http.Client{}
    req, _ := http.NewRequest("GET", api.baseURL+path, nil)
    for key, value := range headers {
        req.Header.Set(key, value)
    }
    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    return result, nil
}

func (api *BullReckonAPI) ExecuteTrade(symbol, action string, quantity int, price float64, scriptName string) (map[string]interface{}, error) {
    path := "/api/trade"
    headers := api.getHeaders("POST", path)
    data := map[string]interface{}{
        "symbol":     symbol,
        "action":     action,
        "quantity":   quantity,
        "price":      price,
        "scriptName": scriptName,
    }
    jsonData, _ := json.Marshal(data)
    client := &http.Client{}
    req, _ := http.NewRequest("POST", api.baseURL+path, bytes.NewBuffer(jsonData))
    req.Header.Set("Content-Type", "application/json")
    for key, value := range headers {
        req.Header.Set(key, value)
    }
    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    return result, nil
}

func (api *BullReckonAPI) RunBacktest(strategyName, symbol, startDate, endDate string, initialCapital float64, params map[string]interface{}) (map[string]interface{}, error) {
    path := "/api/backtest"
    headers := api.getHeaders("POST", path)
    data := map[string]interface{}{
        "strategyName":   strategyName,
        "symbol":         symbol,
        "startDate":      startDate,
        "endDate":        endDate,
        "initialCapital": initialCapital,
        "parameters":     params,
    }
    jsonData, _ := json.Marshal(data)
    client := &http.Client{}
    req, _ := http.NewRequest("POST", api.baseURL+path, bytes.NewBuffer(jsonData))
    req.Header.Set("Content-Type", "application/json")
    for key, value := range headers {
        req.Header.Set(key, value)
    }
    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    var result map[string]interface{}
    json.NewDecoder(resp.Body).Decode(&result)
    return result, nil
}

// Example Strategy: MACD
func calculateMACD(prices []float64) (float64, float64, float64) {
    if len(prices) < 26 {
        return 0, 0, 0
    }
    
    ema12 := calculateEMA(prices, 12)
    ema26 := calculateEMA(prices, 26)
    macd := ema12 - ema26
    signal := calculateEMA([]float64{macd}, 9)
    histogram := macd - signal
    
    return macd, signal, histogram
}

func calculateEMA(prices []float64, period int) float64 {
    if len(prices) < period {
        return 0
    }
    
    multiplier := 2.0 / (float64(period) + 1)
    ema := prices[0]
    
    for i := 1; i < len(prices); i++ {
        ema = (prices[i] * multiplier) + (ema * (1 - multiplier))
    }
    
    return ema
}

func calculateSignal(api *BullReckonAPI, symbol string) string {
    // This would require fetching historical data and calculating MACD
    // For demo purposes, return HOLD
    return "HOLD"
}

func main() {
    api := NewBullReckonAPI("your-email@example.com", "YOUR_PUBLIC_KEY_PEM")
    
    symbol := "AAPL"
    signal := calculateSignal(api, symbol)
    fmt.Printf("Signal for %s: %s\\n", symbol, signal)
    
    // For backtesting, uncomment:
    // params := map[string]interface{}{
    //     "fastPeriod": 12,
    //     "slowPeriod": 26,
    //     "signalPeriod": 9,
    // }
    // result, _ := api.RunBacktest("macd-strategy", symbol, "2023-01-01", "2023-12-31", 10000, params)
    // fmt.Printf("Backtest Result: %v\\n", result)
}
`,
  },
  {
    value: "java",
    label: "Java",
    defaultCode: `// BullReckon Trading Strategy Playground
import java.io.*;
import java.net.*;
import java.util.*;
import java.nio.charset.StandardCharsets;
import com.fasterxml.jackson.databind.ObjectMapper;

public class BullReckonAPI {
    private String email;
    private String publicKey;
    private String baseURL;
    private ObjectMapper mapper;
    
    public BullReckonAPI(String email, String publicKey) {
        this.email = email;
        this.publicKey = publicKey;
        this.baseURL = "https://api.bullreckon.com";
        this.mapper = new ObjectMapper();
    }
    
    private Map<String, String> getHeaders(String method, String path) {
        long timestamp = System.currentTimeMillis();
        Map<String, String> headers = new HashMap<>();
        headers.put("x-api-email", email);
        headers.put("x-api-key", publicKey);
        headers.put("x-api-timestamp", String.valueOf(timestamp));
        return headers;
    }
    
    public Map<String, Object> getQuote(String symbol) throws Exception {
        String path = "/api/market/quote/" + symbol;
        Map<String, String> headers = getHeaders("GET", path);
        
        URL url = new URL(baseURL + path);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        
        for (Map.Entry<String, String> entry : headers.entrySet()) {
            conn.setRequestProperty(entry.getKey(), entry.getValue());
        }
        
        BufferedReader reader = new BufferedReader(new InputStreamReader(conn.getInputStream()));
        StringBuilder response = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            response.append(line);
        }
        reader.close();
        
        return mapper.readValue(response.toString(), Map.class);
    }
    
    // Add other methods similarly...
    
    public static void main(String[] args) {
        BullReckonAPI api = new BullReckonAPI("your-email@example.com", "YOUR_PUBLIC_KEY_PEM");
        
        try {
            Map<String, Object> quote = api.getQuote("AAPL");
            System.out.println("AAPL Quote: " + quote);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
`,
  },
  {
    value: "cpp",
    label: "C++",
    defaultCode: `// BullReckon Trading Strategy Playground
#include <iostream>
#include <string>
#include <vector>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

class BullReckonAPI {
private:
    std::string email;
    std::string publicKey;
    std::string baseURL;
    
    std::map<std::string, std::string> getHeaders(const std::string& method, const std::string& path) {
        auto timestamp = std::to_string(std::chrono::duration_cast<std::chrono::milliseconds>(
            std::chrono::system_clock::now().time_since_epoch()).count());
        
        return {
            {"x-api-email", email},
            {"x-api-key", publicKey},
            {"x-api-timestamp", timestamp}
        };
    }
    
public:
    BullReckonAPI(const std::string& email, const std::string& publicKey)
        : email(email), publicKey(publicKey), baseURL("https://api.bullreckon.com") {}
    
    nlohmann::json getQuote(const std::string& symbol) {
        std::string path = "/api/market/quote/" + symbol;
        auto headers = getHeaders("GET", path);
        
        // Implement HTTP request using curl
        // For brevity, returning mock data
        return {
            {"symbol", symbol},
            {"price", 150.0},
            {"change", 2.5}
        };
    }
};

int main() {
    BullReckonAPI api("your-email@example.com", "YOUR_PUBLIC_KEY_PEM");
    
    auto quote = api.getQuote("AAPL");
    std::cout << "AAPL Quote: " << quote.dump() << std::endl;
    
    return 0;
}
`,
  },
  {
    value: "rust",
    label: "Rust",
    defaultCode: `// BullReckon Trading Strategy Playground
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize)]
struct QuoteResponse {
    symbol: String,
    price: f64,
    change: f64,
    change_percent: f64,
}

struct BullReckonAPI {
    email: String,
    public_key: String,
    base_url: String,
    client: Client,
}

impl BullReckonAPI {
    fn new(email: String, public_key: String) -> Self {
        Self {
            email,
            public_key,
            base_url: "https://api.bullreckon.com".to_string(),
            client: Client::new(),
        }
    }
    
    fn get_headers(&self, _method: &str, _path: &str) -> HashMap<String, String> {
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis()
            .to_string();
        
        let mut headers = HashMap::new();
        headers.insert("x-api-email".to_string(), self.email.clone());
        headers.insert("x-api-key".to_string(), self.public_key.clone());
        headers.insert("x-api-timestamp".to_string(), timestamp);
        headers
    }
    
    async fn get_quote(&self, symbol: &str) -> Result<QuoteResponse, Box<dyn std::error::Error>> {
        let path = format!("/api/market/quote/{}", symbol);
        let headers = self.get_headers("GET", &path);
        
        let mut request = self.client.get(&format!("{}{}", self.base_url, path));
        
        for (key, value) in headers {
            request = request.header(&key, value);
        }
        
        let response = request.send().await?;
        let quote: QuoteResponse = response.json().await?;
        
        Ok(quote)
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let api = BullReckonAPI::new(
        "your-email@example.com".to_string(),
        "YOUR_PUBLIC_KEY_PEM".to_string()
    );
    
    match api.get_quote("AAPL").await {
        Ok(quote) => println!("AAPL Quote: {:?}", quote),
        Err(e) => eprintln!("Error: {}", e),
    }
    
    Ok(())
}
`,
  },
];
