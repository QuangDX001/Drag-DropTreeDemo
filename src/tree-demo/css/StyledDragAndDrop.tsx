import styled from "styled-components";

export const StyledDragAndDrop = styled("div")`
  /* Drag and Drop */
  .drag-item {
    display: inline-block;
    border: 1px dashed gray;
    background-color: white;
    padding: 15px;
    cursor: move;
    user-select: none;
  }

  .drag-item:not(:last-child) {
    margin-right: 15px;
  }

  .drag-item.is-dragging {
    opacity: 0.4;
    z-index: 2;
  }

  /* Ant Tree */
  .ant-tree {
    font-size: 1rem;
  }

  .ant-tree .ant-tree-list-holder-inner {
    border: 1px solid #d7d7d7 !important;
    border-radius: 3px;
    overflow: hidden !important;
  }

  .ant-tree .ant-tree-node-content-wrapper {
    padding: 0;
  }

  .ant-tree .ant-tree-treenode {
    position: relative;
    padding: 0;
  }

  .ant-tree .ant-tree-treenode:not(:last-child) {
    border-bottom: 1px solid #d7d7d7;
  }

  //.ant-tree .ant-tree-treenode .ant-tree-switcher {
  //  position: unset;
  //  width: 0;
  //}

  .ant-tree .ant-tree-treenode .ant-tree-switcher-wrapper {
    position: absolute;
    display: block;
    top: 8px;
    right: 12px;
    z-index: 1;
  }

  .ant-tree .ant-tree-treenode .ant-tree-switcher .ant-tree-switcher-wrapper {
    font-size: 1rem;
    line-height: 1.25;
  }

  .ant-tree .ant-tree-treenode .ant-tree-indent {
    display: none;
  }

  .ant-tree .ant-tree-treenode .ant-tree-draggable-icon {
    display: none;
  }

  .ant-tree .ant-tree-treenode .ant-tree-title .ant-tree-title-wrapper {
    padding: 0.15625rem 2.5rem 0.15625rem 0.75rem;
  }

  .ant-tree .ant-tree-treenode .ant-tree-title .ant-tree-title-wrapper.level-1 {
    padding: 0.5rem 2.5rem 0.5rem 0.75rem;
  }

  .ant-tree .ant-tree-treenode .ant-tree-node-content-wrapper:hover {
    background: none;
  }

  .ant-tree .ant-tree-treenode .ant-tree-title .ant-tree-title-wrapper {
    border: 3px solid #fff;
  }

  .ant-tree .ant-tree-treenode:hover .ant-tree-title .ant-tree-title-wrapper,
  .ant-tree
    .ant-tree-treenode.ant-tree-treenode-selected
    .ant-tree-title
    .ant-tree-title-wrapper {
    background-color: #dae4fb;
  }

  .ant-tree .ant-tree-treenode:hover .ant-tree-switcher-wrapper,
  .ant-tree .ant-tree-treenode:hover .ant-tree-title .ant-tree-title-wrapper,
  .ant-tree
    .ant-tree-treenode.ant-tree-treenode-selected
    .ant-tree-title
    .ant-tree-title-wrapper {
    color: #0056a8;
  }

  .ant-tree .ant-tree-treenode .ant-tree-title .ant-tree-title-wrapper.level-1 {
    border: none;
    font-weight: bold;
    line-height: 1.25;
  }

  .ant-tree
    .ant-tree-treenode:hover
    .ant-tree-title
    .ant-tree-title-wrapper.level-1,
  .ant-tree
    .ant-tree-treenode.ant-tree-treenode-selected
    .ant-tree-title
    .ant-tree-title-wrapper.level-1 {
    background-color: #0056a8;
  }

  .ant-tree .ant-tree-treenode:hover .ant-tree-switcher-wrapper.level-1,
  .ant-tree
    .ant-tree-treenode.ant-tree-treenode-selected
    .ant-tree-switcher-wrapper.level-1,
  .ant-tree
    .ant-tree-treenode:hover
    .ant-tree-title
    .ant-tree-title-wrapper.level-1,
  .ant-tree
    .ant-tree-treenode.ant-tree-treenode-selected
    .ant-tree-title
    .ant-tree-title-wrapper.level-1 {
    color: #fff;
  }

  .ant-tree .ant-tree-treenode .ant-tree-title .ant-tree-title-content {
    display: flex;
    flex-wrap: wrap;
  }

  .ant-tree .ant-tree-treenode .ant-tree-title .ant-tree-title-content:before {
    content: "\f105";
    display: flex;
    font-family: "Font Awesome 6 Pro";
    font-size: 0.75rem;
    margin-top: 1px;
    width: 1rem;
  }

  .ant-tree .ant-tree-treenode .ant-tree-title .ant-tree-title-content span {
    display: flex;
    width: calc(100% - 1rem);
  }

  .ant-tree
    .ant-tree-treenode
    .ant-tree-title
    .ant-tree-title-wrapper.level-1
    .ant-tree-title-content:before {
    margin-top: 3px;
  }
`;
