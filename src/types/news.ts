export type NewsRelevance = 'dns' | 'routing' | 'security' | 'infrastructure';

export interface NewsArticle {
  id: string;
  title: string;
  publisher: 'DNS Locator';
  publishedAt: string;
  summary: string;
  details: string;
  categories: string[];
  relevance: NewsRelevance;
  suggestedDomain?: string;
}

export interface NewsFeedResponse {
  articles: NewsArticle[];
  fetchedAt: string;
  cached: boolean;
}
