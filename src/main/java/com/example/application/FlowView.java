package com.example.application;

import com.vaadin.flow.component.Text;
import com.vaadin.flow.component.orderedlayout.VerticalLayout;
import com.vaadin.flow.router.PageTitle;
import com.vaadin.flow.router.Route;

@Route
@PageTitle("Flow view")
public class FlowView extends VerticalLayout{
    public FlowView() {
        add(new Text("This is a Flow view"));
    }
}
