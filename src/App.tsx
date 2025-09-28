import "./App.css";
import TreeSorted from "./tree-demo/TreeSorted.tsx";
import DragAndDrop from "./drag-and-drop/DragAndDrop.tsx";

function App() {
  return (
    <>
      {/*<h3>Vite + React</h3>*/}
        <div className="container-fluid">
            <div className="card card-full">
                <div className={'card-body'}>
                    <DragAndDrop />
                </div>
            </div>
        </div>

    </>
  );
}

export default App;
