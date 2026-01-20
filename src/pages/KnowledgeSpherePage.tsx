import { useEffect, useState } from "react";
import { invokeCommand } from "../lib/tauri";
import { KnowledgeSphereTab } from "../components/tabs/knowledge/KnowledgeSphereTab";
import { useCollectionStore } from "../stores/collectionStore";

interface Node {
  id: string;
  type: "document" | "extract" | "card";
  label: string;
  connections: string[];
}

export function KnowledgeSpherePage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const activeCollectionId = useCollectionStore((state) => state.activeCollectionId);
  const documentAssignments = useCollectionStore((state) => state.documentAssignments);

  const inActiveCollection = (documentId?: string | null) => {
    if (!activeCollectionId) return true;
    if (!documentId) return true;
    const assigned = documentAssignments[documentId];
    return assigned ? assigned === activeCollectionId : true;
  };

  useEffect(() => {
    loadSphereData();
  }, [activeCollectionId, documentAssignments]);

  const loadSphereData = async () => {
    setIsLoading(true);

    try {
      // Fetch data from backend
      const documents = await invokeCommand<any[]>("get_documents");
      const extracts = await invokeCommand<any[]>("get_extracts", { documentId: null });
      const learningItems = await invokeCommand<any[]>("get_learning_items");

      // Build nodes array
      const nodeMap = new Map<string, Node>();

      // Add document nodes
      documents
        .filter((doc: any) => inActiveCollection(doc.id))
        .forEach((doc: any) => {
          nodeMap.set(`doc-${doc.id}`, {
            id: `doc-${doc.id}`,
            type: "document",
            label: doc.title || "Untitled",
            connections: [],
          });
        });

      // Add extract nodes and connect to documents
      extracts
        .filter((extract: any) => inActiveCollection(extract.documentId))
        .forEach((extract: any) => {
          const extractId = `extract-${extract.id}`;
          const docId = `doc-${extract.documentId}`;

          nodeMap.set(extractId, {
            id: extractId,
            type: "extract",
            label: extract.content?.substring(0, 30) + "..." || "Untitled",
            connections: [],
          });

          // Connect document to extract
          if (nodeMap.has(docId)) {
            const doc = nodeMap.get(docId)!;
            doc.connections.push(extractId);
          }
        });

      // Add flashcard nodes and connect to extracts
      learningItems
        .filter((item: any) => inActiveCollection(item.documentId))
        .forEach((item: any) => {
          const cardId = `card-${item.id}`;
          const extractId = `extract-${item.extractId}`;

          nodeMap.set(cardId, {
            id: cardId,
            type: "card",
            label: item.question?.substring(0, 20) + "..." || "Untitled",
            connections: [],
          });

          // Connect extract to card
          if (item.extractId && nodeMap.has(extractId)) {
            const extract = nodeMap.get(extractId)!;
            extract.connections.push(cardId);
          }
        });

      setNodes(Array.from(nodeMap.values()));
    } catch (error) {
      console.error("Failed to load sphere data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-cream">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-300 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-foreground-secondary">Loading knowledge sphere...</p>
        </div>
      </div>
    );
  }

  return <KnowledgeSphereTab nodes={nodes} />;
}
