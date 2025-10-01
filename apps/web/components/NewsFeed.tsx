import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, ExternalLink, TrendingUp, TrendingDown } from "lucide-react";

const NewsFeed = () => {
  const news = [
    {
      id: 1,
      title:
        "Federal Reserve Maintains Interest Rates as Inflation Shows Signs of Cooling",
      summary:
        "The Federal Reserve decided to keep interest rates unchanged at 5.25%-5.50% range, citing recent data showing inflation moving toward the 2% target.",
      source: "Financial Times",
      time: "2 hours ago",
      category: "Economic Policy",
      sentiment: "neutral",
      image:
        "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=200&fit=crop",
    },
    {
      id: 2,
      title: "Tech Stocks Rally as AI Investment Surge Continues",
      summary:
        "Major technology companies see significant gains as investors pour billions into artificial intelligence infrastructure and development.",
      source: "Bloomberg",
      time: "4 hours ago",
      category: "Technology",
      sentiment: "positive",
      image:
        "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=400&h=200&fit=crop",
    },
    {
      id: 3,
      title: "Oil Prices Decline on Global Economic Concerns",
      summary:
        "Crude oil futures dropped 3.2% amid worries about global economic growth and rising U.S. inventory levels.",
      source: "Reuters",
      time: "6 hours ago",
      category: "Commodities",
      sentiment: "negative",
      image:
        "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=200&fit=crop",
    },
    {
      id: 4,
      title: "European Markets Open Higher Despite Banking Sector Concerns",
      summary:
        "European indices opened with gains despite ongoing concerns in the banking sector, with investors focusing on corporate earnings.",
      source: "MarketWatch",
      time: "8 hours ago",
      category: "Global Markets",
      sentiment: "positive",
      image:
        "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=200&fit=crop",
    },
  ];

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <TrendingUp className="h-3 w-3 text-success" />;
      case "negative":
        return <TrendingDown className="h-3 w-3 text-destructive" />;
      default:
        return null;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-success";
      case "negative":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="grid gap-6">
      {news.map((article) => (
        <Card
          key={article.id}
          className="trading-gradient hover:shadow-lg transition-all duration-200 cursor-pointer group"
        >
          <CardContent className="p-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              </div>
              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>
                  <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                </div>

                <p className="text-muted-foreground text-sm leading-relaxed">
                  {article.summary}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs">
                      {article.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {article.time}
                    </div>
                    <div className="text-xs font-medium text-muted-foreground">
                      {article.source}
                    </div>
                  </div>

                  <div
                    className={`flex items-center gap-1 text-xs font-medium ${getSentimentColor(article.sentiment)}`}
                  >
                    {getSentimentIcon(article.sentiment)}
                    <span className="capitalize">{article.sentiment}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default NewsFeed;
