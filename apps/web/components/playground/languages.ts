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
];
