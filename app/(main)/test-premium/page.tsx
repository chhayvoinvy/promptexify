import { PremiumUpgradeModal } from "@/components/premium-upgrade-modal";

// Mock post data for testing
const mockPremiumPost = {
  id: "test-1",
  title: "Test Premium Post",
  slug: "test-premium-post",
  description: "This is a test premium post to verify Stripe integration",
  content: "This is premium content that should be locked behind a paywall...",
  featuredImage: "/images/post-1.jpg",
  featuredVideo: null,
  isPremium: true,
  isPublished: true,
  status: "APPROVED" as const,
  viewCount: 0,
  authorId: "test-author",
  categoryId: "test-category",
  createdAt: new Date(),
  updatedAt: new Date(),
  author: {
    id: "test-author",
    name: "Test Author",
    email: "test@example.com",
    avatar: null,
  },
  category: {
    id: "test-category",
    name: "Test Category",
    slug: "test-category",
    description: "Test category description",
    parentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    parent: null,
    children: [],
    posts: [],
  },
  tags: [
    {
      id: "test-tag",
      name: "Test Tag",
      slug: "test-tag",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  bookmarks: [],
  favorites: [],
  views: [],
  _count: {
    views: 0,
    bookmarks: 0,
    favorites: 0,
  },
};

export default function TestPremiumPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold">Stripe Integration Test</h1>
        <p className="text-muted-foreground">
          This page will automatically show the premium modal to test the Stripe
          integration.
        </p>
        <PremiumUpgradeModal post={mockPremiumPost} />
      </div>
    </div>
  );
}
