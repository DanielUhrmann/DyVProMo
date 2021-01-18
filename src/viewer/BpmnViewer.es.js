import React, { useEffect, useState } from "react";
import NavigatedViewer from "bpmn-js/lib/NavigatedViewer";
import { is } from "bpmn-js/lib/util/ModelUtil";
import Toolbar from "../toolbar/Toolbar.es";
import BdvUtil from "../util/BdvUtil";

const BpmnViewer = ({ fileData, setFileData }) => {
    let viewer;
    const [canvas, setCanvas] = useState(null);
    const [overlays, setOverlays] = useState(null);
    const [elementRegistry, setElementRegistry] = useState(null);
    const [graphicsFactory, setGraphicsFactory] = useState(null);

    const [presentFirstElements, setPresentFirstElements] = useState([]);

    const [allPools, setAllPools] = useState([]);
    const [allLanes, setAllLanes] = useState([]);
    const [allAnnotations, setAllAnnotations] = useState(null);
    const [allDataObjects, setAllDataObjects] = useState(null);
    const [allDataStores, setAllDataStores] = useState(null);
    const [allMessageFlows, setAllMessageFlows] = useState(null);

    useEffect(() => {
        setupModeler();
    }, []);

    const setupModeler = () => {
        viewer = new NavigatedViewer({ container: "#canvas" });
        importXML(fileData);
    };

    const importXML = (fileData) => {
        viewer.importXML(fileData).then(() => {
            setCanvas(viewer.get("canvas"));
            setOverlays(viewer.get("overlays"));
            setElementRegistry(viewer.get("elementRegistry"));
            setGraphicsFactory(viewer.get("graphicsFactory"));

            setPresentFirstElements(selectAllFirstElems());
            setAllPools(selectElements("Participant"));
            setAllLanes(selectElements("Lane"));
            setAllAnnotations(selectElements("TextAnnotation"));
            setAllDataObjects(selectElements("DataObjectReference"));
            setAllDataStores(selectElements("DataStoreReference"));
            setAllMessageFlows(selectElements("MessageFlow"));
            //Center and zoom to display whole bpmn model
            viewer.get("canvas").zoom("fit-viewport", "auto");
        });
    };

    /**
     * removes all incoming and outgoing connections from element
     * @param element is single element
     */
    const removeConnections = (element) => {
        let incomingCons = element.incoming;
        let outgoingCons = element.outgoing;

        removeConnectionArray(incomingCons);
        removeConnectionArray(outgoingCons);
    };

    /**
     * removes all incoming or outgoing connections from canvas
     * @param connectionArray is array which contains all incoming or outgoing connections
     */
    const removeConnectionArray = (connectionArray) => {
        connectionArray.forEach((con, index) => {
            canvas.removeConnection(con);
        });
    };

    /**
     * removes all elements including incoming and outgoing connections
     * @param elements all Elements which must be removed
     */
    const removeElements = (elements) => {
        elements.forEach((elem, index) => {
            removeConnections(elem);
            canvas.removeShape(elem);
        });
    };

    /**
     * add all incoming and outgoing connections from element
     * @param element is single element
     */
    const addConnections = (element) => {
        let incomingCons = element.incoming;
        let outgoingCons = element.outgoing;

        addConnectionArray(incomingCons);
        addConnectionArray(outgoingCons);
    };

    /**
     * add all incoming or outgoing connections from canvas
     * @param connectionArray is array which contains all incoming or outgoing connections
     */
    const addConnectionArray = (connectionArray) => {
        connectionArray.forEach((con, index) => {
            if (!elementRegistry.get(con.id)) {
                if (con.type === "label") {
                    console.log(con);
                    canvas.addShape(con);
                } else {
                    canvas.addConnection(con);
                }
            }
        });
    };

    /**
     * add all elements including incoming and outgoing connections
     * @param elements all Elements which must be removed
     */
    const addElements = (elements) => {
        elements.forEach((elem, index) => {
            if (!elementRegistry.get(elem.id)) {
                addConnections(elem);
                canvas.addShape(elem);
            }
        });
    };

    /**
     * select all elements with given bpmn Element name
     * @param bpmnElementName
     * @returns array filled with model elements
     */
    const selectElements = (bpmnElementName) => {
        return viewer.get("elementRegistry").filter((element) => {
            return is(element, "bpmn:" + bpmnElementName);
        });
    };

    /**
     * select all elements that appear for the first time
     * regardless of whether being a shape or connection
     * @returns array filled with model elements
     */
    const selectAllFirstElems = () => {
        let a = viewer
            .get("elementRegistry")
            .filter((element) => element.type.startsWith("bpmn:"));
        let b = [];
        a.forEach((element) => {
            let alreadyAdded = false;
            b.forEach((elem) => {
                if (elem.type === element.type) {
                    alreadyAdded = true;
                }
            });
            if (!alreadyAdded && element.type !== "bpmn:Collaboration") {
                b.push(element);
            }
        });
        return b;
    };

    /**
     * add overlay for every given element and
     * position it based on its type
     * @param element array filled with all first appear elems
     * @param content is a String that is inside the overlay
     * @returns {String} elementID if you want to use it
     */
    const addOverlay = (element, content) => {
        console.log(element);
        let position = BdvUtil.getPosition(element, content);
        let html = '<div class="diagram-note p-1">' + content + "<div/>";
        return overlays.add(element, { position: position, html: html });
    };

    /**
     * removes all overlays
     */
    const removeOverlays = () => {
        overlays.clear();
    };

    /**
     * iterates over given elements array and call
     * the addOverlay method with its type name
     * @param elements array
     */
    const addOverlays = (elements) => {
        elements.forEach((elem) => {
            let content =
                elem.type.split(":")[1] === "Participant"
                    ? "Pool"
                    : elem.type.split(":")[1];
            addOverlay(elem, content);
        });
    };

    /**
     * highlights the given element
     * fills the pool or lane with green color
     * @param elem is either pool or lane
     */
    const highlightElement = (elem) => {
        elem.businessObject.di.set("fill", "rgba(0, 80, 0, 1)");
        const gfx = elementRegistry.getGraphics(elem);
        const type = elem.waypoints ? "connection" : "shape";
        graphicsFactory.update(type, elem, gfx);
    };

    /**
     * removes the highlight of the given element
     * fills the pool or lane with white color
     * @param elem is either pool or lane
     */
    const removeHighlightElement = (elem) => {
        elem.businessObject.di.set("fill", "rgba(255, 255, 255, 1)");
        const gfx = elementRegistry.getGraphics(elem);
        const type = elem.waypoints ? "connection" : "shape";
        graphicsFactory.update(type, elem, gfx);
    };

    return (
        <>
            <div id="canvas" />
            <Toolbar
                setFileData={setFileData}
                addElements={addElements}
                removeElements={removeElements}
                removeConnectionArray={removeConnectionArray}
                addConnectionArray={addConnectionArray}
                addOverlays={addOverlays}
                removeOverlays={removeOverlays}
                highlightElement={highlightElement}
                removeHighlightElement={removeHighlightElement}
                allPools={allPools}
                allLanes={allLanes}
                presentFirstElements={presentFirstElements}
                allAnnotations={allAnnotations}
                allDataObjects={allDataObjects}
                allDataStores={allDataStores}
                allMessageFlows={allMessageFlows}
            />
        </>
    );
};

export default BpmnViewer;
