import { useState } from "react";
import Header from "../Header";

export default function HeaderExample() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    console.log("Refresh triggered");
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <Header
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    />
  );
}
